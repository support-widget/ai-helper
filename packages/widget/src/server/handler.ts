import { createAnthropicProvider } from './anthropic';
import { checkRateLimit } from './rate-limit';
import {
  DEFAULT_MAX_INPUT_CHARS,
  DEFAULT_MAX_MESSAGES,
  DEFAULT_MAX_TOKENS,
  DEFAULT_MODEL,
  buildSystemPrompt,
} from './prompt';
import { requestSchema } from './schema';
import type {
  ChatProvider,
  CreateChatHandlerOptions,
  FinishInfo,
  ServerMessage,
} from './types';

const MAX_BODY_BYTES = 256 * 1024;
const MAX_METADATA_BYTES = 8 * 1024;

type JsonErrorCode =
  | 'method_not_allowed'
  | 'origin_not_allowed'
  | 'unsupported_media_type'
  | 'payload_too_large'
  | 'invalid_json'
  | 'invalid_request'
  | 'rate_limited'
  | 'server_misconfigured'
  | 'internal_error';

function env(name: string): string | undefined {
  return typeof process !== 'undefined' ? process.env?.[name] : undefined;
}

function json(
  status: number,
  body: unknown,
  headers: Headers,
): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
  responseHeaders.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

function errorResponse(
  status: number,
  code: JsonErrorCode,
  message: string,
  headers: Headers,
): Response {
  return json(status, { error: { code, message } }, headers);
}

function originHeaders(
  request: Request,
  allowedOrigins: string[] | undefined,
): { headers: Headers; denied: boolean; origin: string | null } {
  const headers = new Headers();
  const origin = request.headers.get('origin');
  if (!allowedOrigins || allowedOrigins.length === 0 || !origin) {
    return { headers, denied: false, origin };
  }

  const normalized = origin.replace(/\/$/, '');
  const allowed = allowedOrigins.some(
    (entry) => entry === '*' || entry.replace(/\/$/, '') === normalized,
  );
  if (!allowed) return { headers, denied: true, origin };

  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Access-Control-Max-Age', '86400');
  return { headers, denied: false, origin };
}

function rateHeaders(
  headers: Headers,
  decision: { limit: number; remaining: number; resetAt: number },
): void {
  if (decision.limit <= 0) return;
  headers.set('X-RateLimit-Limit', String(decision.limit));
  headers.set('X-RateLimit-Remaining', String(decision.remaining));
  headers.set('X-RateLimit-Reset', String(Math.ceil(decision.resetAt / 1000)));
}

function normalizeMessages(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  maxMessages: number,
  maxInputChars: number,
): { messages: ServerMessage[] } | { error: string; status: number; code: JsonErrorCode } {
  if (messages.length > maxMessages) {
    return {
      error: `Conversations are limited to ${maxMessages} messages. Start a new chat.`,
      status: 400,
      code: 'invalid_request',
    };
  }

  let totalChars = 0;
  const cleaned: ServerMessage[] = [];
  for (const message of messages) {
    const content = message.content.trim();
    if (!content) continue;
    totalChars += content.length;
    cleaned.push({ role: message.role, content });
  }

  if (totalChars > maxInputChars) {
    return {
      error: `The conversation is too long (${maxInputChars.toLocaleString()} character limit). Start a new chat.`,
      status: 413,
      code: 'payload_too_large',
    };
  }

  const last = cleaned[cleaned.length - 1];
  if (!last || last.role !== 'user') {
    return {
      error: 'The last message must be from the user.',
      status: 400,
      code: 'invalid_request',
    };
  }

  while (cleaned[0]?.role === 'assistant') cleaned.shift();
  if (!cleaned.some((message) => message.role === 'user')) {
    return {
      error: 'At least one user message is required.',
      status: 400,
      code: 'invalid_request',
    };
  }

  const merged: ServerMessage[] = [];
  for (const message of cleaned) {
    const previous = merged[merged.length - 1];
    if (previous?.role === message.role) {
      previous.content = `${previous.content}\n\n${message.content}`;
    } else {
      merged.push({ ...message });
    }
  }

  return { messages: merged };
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

function sse(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/**
 * Standard Web Request -> Response handler. Useful in Next.js route handlers,
 * Hono, Remix, Bun, Cloudflare Workers, and anywhere else with Web APIs.
 */
export function createChatHandler(
  options: CreateChatHandlerOptions = {},
): (request: Request) => Promise<Response> {
  const model = options.model ?? env('AI_HELPER_MODEL') ?? DEFAULT_MODEL;
  const maxTokens = Math.min(Math.max(options.maxTokens ?? DEFAULT_MAX_TOKENS, 1), 4096);
  const maxMessages = Math.max(options.maxMessages ?? DEFAULT_MAX_MESSAGES, 1);
  const maxInputChars = Math.max(options.maxInputChars ?? DEFAULT_MAX_INPUT_CHARS, 1);
  const allowedOrigins = options.allowedOrigins;
  const apiKey = options.apiKey ?? env('ANTHROPIC_API_KEY');

  let provider: ChatProvider | null = options.provider ?? null;
  if (!provider && apiKey) {
    provider = createAnthropicProvider({ apiKey, baseURL: options.baseURL });
  }

  return async function chatHandler(request: Request): Promise<Response> {
    const origin = originHeaders(request, allowedOrigins);
    if (origin.denied) {
      return errorResponse(
        403,
        'origin_not_allowed',
        'This origin is not allowed to use the chat service.',
        origin.headers,
      );
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: origin.headers });
    }

    if (request.method !== 'POST') {
      const headers = new Headers(origin.headers);
      headers.set('Allow', 'POST, OPTIONS');
      return errorResponse(405, 'method_not_allowed', 'Use POST for chat requests.', headers);
    }

    const decision = await checkRateLimit(request, options.rateLimit);
    const headers = new Headers(origin.headers);
    rateHeaders(headers, decision);
    if (!decision.allowed) {
      const retryAfter = Math.max(1, Math.ceil((decision.resetAt - Date.now()) / 1000));
      headers.set('Retry-After', String(retryAfter));
      return errorResponse(
        429,
        'rate_limited',
        `You are sending messages too quickly. Please wait ${retryAfter} seconds and try again.`,
        headers,
      );
    }

    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return errorResponse(
        415,
        'unsupported_media_type',
        'Content-Type must be application/json.',
        headers,
      );
    }

    const contentLength = Number.parseInt(request.headers.get('content-length') ?? '', 10);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return errorResponse(413, 'payload_too_large', 'Request body is too large.', headers);
    }

    let rawBody: string;
    try {
      rawBody = await request.text();
    } catch {
      return errorResponse(400, 'invalid_json', 'Could not read the request body.', headers);
    }
    if (rawBody.length > MAX_BODY_BYTES) {
      return errorResponse(413, 'payload_too_large', 'Request body is too large.', headers);
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawBody);
    } catch {
      return errorResponse(400, 'invalid_json', 'Request body must be valid JSON.', headers);
    }

    const parsed = requestSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return errorResponse(
        400,
        'invalid_request',
        'Send { messages: [{ role, content }], metadata? } with valid roles and content.',
        headers,
      );
    }

    const metadata = parsed.data.metadata ?? {};
    try {
      if (JSON.stringify(metadata).length > MAX_METADATA_BYTES) {
        return errorResponse(413, 'payload_too_large', 'Metadata is too large.', headers);
      }
    } catch {
      return errorResponse(400, 'invalid_request', 'Metadata must be JSON serializable.', headers);
    }

    const normalized = normalizeMessages(parsed.data.messages, maxMessages, maxInputChars);
    if ('error' in normalized) {
      return errorResponse(normalized.status, normalized.code, normalized.error, headers);
    }

    if (!provider) {
      return errorResponse(
        500,
        'server_misconfigured',
        'The chat service is not configured. Set ANTHROPIC_API_KEY on the server.',
        headers,
      );
    }

    const activeProvider = provider;
    const abortController = new AbortController();
    const onAbort = () => abortController.abort();
    request.signal.addEventListener('abort', onAbort, { once: true });

    const responseHeaders = new Headers(headers);
    responseHeaders.set('Content-Type', 'text/event-stream; charset=utf-8');
    responseHeaders.set('Cache-Control', 'no-cache, no-transform');
    responseHeaders.set('X-Accel-Buffering', 'no');

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const startedAt = Date.now();
        let responseChars = 0;
        let status: FinishInfo['status'] = 'done';
        let usage: unknown;
        let caughtError: unknown;
        let finishReason = 'stop';

        const enqueue = (event: string, data: unknown) => {
          if (!abortController.signal.aborted) controller.enqueue(sse(event, data));
        };

        try {
          const context = options.context ? await options.context(normalized.messages) : '';
          const system = buildSystemPrompt(options.systemPrompt, context ?? '');

          for await (const event of activeProvider.stream({
            messages: normalized.messages,
            system,
            maxTokens,
            model,
            signal: abortController.signal,
          })) {
            if (abortController.signal.aborted) {
              status = 'aborted';
              break;
            }
            if (event.type === 'text') {
              responseChars += event.text.length;
              enqueue('delta', { text: event.text });
            } else if (event.type === 'done') {
              finishReason = event.finishReason ?? 'stop';
              usage = event.usage;
            }
          }

          if (!abortController.signal.aborted) {
            enqueue('done', {
              finishReason,
              ...(usage ? { usage } : {}),
            });
          } else {
            status = 'aborted';
          }
        } catch (error) {
          caughtError = error;
          if (abortController.signal.aborted || isAbortError(error)) {
            status = 'aborted';
          } else {
            status = 'error';
            try {
              enqueue('error', {
                error: 'The assistant is temporarily unavailable. Please try again.',
                code: 'server_error',
              });
            } catch {
              // The consumer may have disconnected.
            }
          }
        } finally {
          request.signal.removeEventListener('abort', onAbort);
          try {
            controller.close();
          } catch {
            // Already canceled.
          }
          const info: FinishInfo = {
            status,
            model,
            messages: normalized.messages,
            metadata,
            responseChars,
            durationMs: Date.now() - startedAt,
            usage,
            error: caughtError,
          };
          try {
            await options.onFinish?.(info);
          } catch {
            // Logging must never affect the stream.
          }
        }
      },
      cancel() {
        abortController.abort();
        request.signal.removeEventListener('abort', onAbort);
      },
    });

    return new Response(stream, { status: 200, headers: responseHeaders });
  };
}
