import type { IncomingMessage, ServerResponse } from 'node:http';

type WebHandler = (request: Request) => Promise<Response>;

export interface ExpressLikeRequest extends IncomingMessage {
  body?: unknown;
  originalUrl?: string;
  protocol?: string;
}

export type ExpressLikeResponse = ServerResponse;
export type NextFunction = (error?: unknown) => void;

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function bodyOf(req: IncomingMessage & { body?: unknown }): Promise<string> {
  if (req.body !== undefined) {
    if (typeof req.body === 'string') return req.body;
    if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
    if (req.body === null) return '';
    return JSON.stringify(req.body);
  }
  if (req.readableEnded) return '';
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function requestUrl(req: ExpressLikeRequest): string {
  const forwardedProto = firstHeader(req.headers['x-forwarded-proto']);
  const encrypted = Boolean((req.socket as { encrypted?: boolean } | undefined)?.encrypted);
  const protocol = forwardedProto ?? req.protocol ?? (encrypted ? 'https' : 'http');
  const host = firstHeader(req.headers.host) ?? 'localhost';
  const raw = req.originalUrl ?? req.url ?? '/';
  return new URL(raw, `${protocol}://${host}`).toString();
}

function toHeaders(req: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (key === 'content-length' || key === 'transfer-encoding') continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else {
      headers.set(key, value);
    }
  }
  return headers;
}

async function writeChunk(res: ServerResponse, chunk: Uint8Array): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    res.write(Buffer.from(chunk), (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function writeResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  if (!response.body) {
    res.end();
    return;
  }

  const reader = response.body.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (res.destroyed) {
        await reader.cancel();
        break;
      }
      if (value) await writeChunk(res, value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!res.writableEnded) res.end();
}

function sendAdapterError(res: ServerResponse): void {
  if (res.headersSent) {
    if (!res.writableEnded) res.end();
    return;
  }
  res.statusCode = 500;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(
    JSON.stringify({
      error: { code: 'internal_error', message: 'The chat request could not be handled.' },
    }),
  );
}

/**
 * Adapter for Node's built-in `http`, Bun.serve's node compatibility, and
 * Express (see toExpressHandler for a typed convenience wrapper).
 */
export function toNodeHandler(
  handler: WebHandler,
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  return async function nodeHandler(req, res) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    const close = () => {
      if (!res.writableEnded) abort();
    };
    req.once('aborted', abort);
    res.once('close', close);

    try {
      const method = (req.method ?? 'GET').toUpperCase();
      const body = await bodyOf(req as IncomingMessage & { body?: unknown });
      const request = new Request(requestUrl(req as ExpressLikeRequest), {
        method,
        headers: toHeaders(req),
        body: method === 'GET' || method === 'HEAD' ? undefined : body,
        signal: controller.signal,
      });
      const response = await handler(request);
      await writeResponse(res, response);
    } catch {
      if (!controller.signal.aborted) sendAdapterError(res);
    } finally {
      req.removeListener('aborted', abort);
      res.removeListener('close', close);
    }
  };
}

/**
 * Express wrapper. Use app.post('/api/chat', toExpressHandler(handler)).
 * It accepts either a raw request body or req.body already parsed by
 * express.json(); the latter is converted back to JSON for the core handler.
 */
export function toExpressHandler(handler: WebHandler) {
  const nodeHandler = toNodeHandler(handler);
  return async function expressHandler(
    req: ExpressLikeRequest,
    res: ExpressLikeResponse,
    _next?: NextFunction,
  ): Promise<void> {
    await nodeHandler(req, res);
  };
}
