import { AiHelperError, type WireMessage } from './types';

export interface StreamChatOptions {
  endpoint: string;
  messages: WireMessage[];
  metadata?: Record<string, unknown>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  onDelta: (text: string) => void;
}

export interface StreamChatResult {
  finishReason?: string;
  usage?: unknown;
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

async function readErrorPayload(response: Response): Promise<{ message?: string; code?: string }> {
  const contentType = response.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) {
      const body: unknown = await response.json();
      if (body && typeof body === 'object') {
        const record = body as Record<string, unknown>;
        const nested =
          record.error && typeof record.error === 'object'
            ? (record.error as Record<string, unknown>)
            : record;
        return {
          message: typeof nested.message === 'string' ? nested.message : undefined,
          code: typeof nested.code === 'string' ? nested.code : undefined,
        };
      }
    } else {
      const text = await response.text();
      if (text && text.length < 500) return { message: text };
    }
  } catch {
    // The status code still gives us enough to produce a useful error.
  }
  return {};
}

function friendlyHttpError(
  status: number,
  payload: { message?: string; code?: string },
  retryAfter: string | null,
): AiHelperError {
  if (status === 429) {
    return new AiHelperError(
      'rate_limited',
      payload.message ??
        'You are sending messages a little too quickly. Please wait a moment and try again.',
      { status, retryAfter },
    );
  }
  if (status === 401 || status === 403) {
    return new AiHelperError(
      'unauthorized',
      payload.message ?? 'The chat service is not configured correctly. Please contact the site owner.',
      { status, retryAfter },
    );
  }
  if (status === 400 || status === 413 || status === 415 || status === 422) {
    return new AiHelperError(
      'invalid_request',
      payload.message ?? 'That message could not be sent. Please shorten it and try again.',
      { status, retryAfter },
    );
  }
  if (status >= 500) {
    return new AiHelperError(
      'server_error',
      payload.message ?? 'The assistant is having trouble right now. Please try again shortly.',
      { status, retryAfter },
    );
  }
  return new AiHelperError(
    'network_error',
    payload.message ?? `The chat request failed (HTTP ${status}).`,
    { status, retryAfter },
  );
}

interface ParsedSseEvent {
  event: string;
  data: string;
}

function parseEventBlock(block: string): ParsedSseEvent | null {
  let event = 'message';
  const data: string[] = [];
  for (const rawLine of block.split(/\r?\n/)) {
    if (!rawLine || rawLine.startsWith(':')) continue;
    const colon = rawLine.indexOf(':');
    const field = colon === -1 ? rawLine : rawLine.slice(0, colon);
    let value = colon === -1 ? '' : rawLine.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') event = value;
    if (field === 'data') data.push(value);
  }
  if (data.length === 0) return null;
  return { event, data: data.join('\n') };
}

function parseJsonData(data: string, eventName: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(data);
    if (value && typeof value === 'object') return value as Record<string, unknown>;
  } catch {
    // Fall through to a protocol error.
  }
  throw new AiHelperError(
    'protocol_error',
    `The chat service sent an invalid "${eventName}" event.`,
  );
}

/**
 * Consume the documented SSE chat protocol without any third-party runtime.
 * The parser handles multi-line data, CRLF, comments, and split network chunks.
 */
export async function streamChat(options: StreamChatOptions): Promise<StreamChatResult> {
  let response: Response;
  try {
    response = await fetch(options.endpoint, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify({
        messages: options.messages,
        metadata: options.metadata ?? {},
      }),
      signal: options.signal,
      credentials: 'same-origin',
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new AiHelperError(
      'network_error',
      'Could not reach the assistant. Check your connection and try again.',
      { cause: error },
    );
  }

  if (!response.ok) {
    const payload = await readErrorPayload(response);
    throw friendlyHttpError(response.status, payload, response.headers.get('retry-after'));
  }

  if (!response.body) {
    throw new AiHelperError('protocol_error', 'The chat service returned an empty stream.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sawDone = false;
  let finishReason: string | undefined;
  let usage: unknown;

  const dispatch = (block: string): void => {
    const parsed = parseEventBlock(block);
    if (!parsed) return;
    if (parsed.data === '[DONE]') {
      sawDone = true;
      return;
    }
    const data = parseJsonData(parsed.data, parsed.event);
    switch (parsed.event) {
      case 'delta': {
        const text =
          typeof data.text === 'string'
            ? data.text
            : typeof data.delta === 'string'
              ? data.delta
              : '';
        if (text) options.onDelta(text);
        break;
      }
      case 'done':
        sawDone = true;
        finishReason = typeof data.finishReason === 'string' ? data.finishReason : undefined;
        usage = data.usage;
        break;
      case 'error':
        throw new AiHelperError(
          'server_error',
          typeof data.error === 'string'
            ? data.error
            : typeof data.message === 'string'
              ? data.message
              : 'The assistant ran into an error.',
        );
      default:
        // Unknown events are ignored so the protocol can grow compatibly.
        break;
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      while (true) {
        const separator = buffer.indexOf('\n\n');
        if (separator === -1) break;
        const block = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        dispatch(block);
      }
    }
    buffer += decoder.decode().replace(/\r\n/g, '\n');
    if (buffer.trim()) dispatch(buffer);
  } catch (error) {
    if (isAbortError(error)) throw error;
    if (error instanceof AiHelperError) throw error;
    throw new AiHelperError('network_error', 'The response stream was interrupted.', {
      cause: error,
    });
  } finally {
    reader.releaseLock();
  }

  if (!sawDone) {
    throw new AiHelperError(
      'incomplete_stream',
      'The response was cut off before it finished. Please try again.',
    );
  }

  return { finishReason, usage };
}

export { isAbortError };
