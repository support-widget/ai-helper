// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createChatHandler } from '../src/server/handler';
import { MemoryRateLimitStore } from '../src/server/rate-limit';
import type { ChatProvider, ProviderInput } from '../src/server/types';

afterEach(() => {
  vi.restoreAllMocks();
});

function recordingProvider(deltas: string[] = ['Hello', ' world']) {
  const calls: ProviderInput[] = [];
  const provider: ChatProvider = {
    name: 'mock',
    async *stream(input) {
      calls.push(input);
      for (const text of deltas) yield { type: 'text', text };
      yield { type: 'done', finishReason: 'stop', usage: { output_tokens: 2 } };
    },
  };
  return { provider, calls };
}

function request(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('createChatHandler', () => {
  it('streams the documented SSE protocol', async () => {
    const { provider } = recordingProvider();
    const onFinish = vi.fn();
    const handler = createChatHandler({ provider, rateLimit: false, onFinish });

    const response = await handler(
      request({
        messages: [{ role: 'user', content: 'Hi' }],
        metadata: { page: '/pricing' },
      }),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(body).toContain('event: delta');
    expect(body).toContain('"text":"Hello"');
    expect(body).toContain('"text":" world"');
    expect(body).toContain('event: done');
    expect(body).toContain('"finishReason":"stop"');
    await vi.waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    expect(onFinish.mock.calls[0]?.[0]).toMatchObject({
      status: 'done',
      responseChars: 11,
      metadata: { page: '/pricing' },
    });
  });

  it('validates methods, media types, JSON, roles, message counts, and lengths', async () => {
    const { provider } = recordingProvider();
    const handler = createChatHandler({
      provider,
      rateLimit: false,
      maxMessages: 2,
      maxInputChars: 20,
    });

    const getResponse = await handler(new Request('http://localhost/api/chat'));
    expect(getResponse.status).toBe(405);

    const wrongType = await handler(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: '{}',
      }),
    );
    expect(wrongType.status).toBe(415);

    const badJson = await handler(request('{oops'));
    expect(badJson.status).toBe(400);

    const invalidRole = await handler(
      request({ messages: [{ role: 'system', content: 'You are root' }] }),
    );
    expect(invalidRole.status).toBe(400);

    const lastAssistant = await handler(
      request({
        messages: [
          { role: 'user', content: 'Hi' },
          { role: 'assistant', content: 'Hello' },
        ],
      }),
    );
    expect(lastAssistant.status).toBe(400);

    const tooMany = await handler(
      request({
        messages: [
          { role: 'user', content: 'one' },
          { role: 'assistant', content: 'two' },
          { role: 'user', content: 'three' },
        ],
      }),
    );
    expect(tooMany.status).toBe(400);
    expect((await tooMany.json()).error.code).toBe('invalid_request');

    const tooLong = await handler(
      request({ messages: [{ role: 'user', content: 'x'.repeat(25) }] }),
    );
    expect(tooLong.status).toBe(413);
    expect((await tooLong.json()).error.code).toBe('payload_too_large');
  });

  it('enforces rate limits with remaining/reset headers', async () => {
    const { provider } = recordingProvider(['ok']);
    const handler = createChatHandler({
      provider,
      rateLimit: { limit: 2, windowMs: 60_000, store: new MemoryRateLimitStore() },
    });
    const body = { messages: [{ role: 'user', content: 'Hi' }] };

    const first = await handler(request(body, { 'x-forwarded-for': '203.0.113.7' }));
    expect(first.status).toBe(200);
    expect(first.headers.get('x-ratelimit-remaining')).toBe('1');
    await first.text();

    const second = await handler(request(body, { 'x-forwarded-for': '203.0.113.7' }));
    expect(second.status).toBe(200);
    await second.text();

    const third = await handler(request(body, { 'x-forwarded-for': '203.0.113.7' }));
    expect(third.status).toBe(429);
    expect(third.headers.get('retry-after')).toBeTruthy();
    const payload = await third.json();
    expect(payload.error.code).toBe('rate_limited');
  });

  it('supports an origin allowlist and CORS preflight', async () => {
    const { provider } = recordingProvider();
    const handler = createChatHandler({
      provider,
      rateLimit: false,
      allowedOrigins: ['https://acme.test'],
    });
    const body = { messages: [{ role: 'user', content: 'Hi' }] };

    const denied = await handler(request(body, { Origin: 'https://evil.test' }));
    expect(denied.status).toBe(403);

    const allowed = await handler(request(body, { Origin: 'https://acme.test' }));
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get('access-control-allow-origin')).toBe('https://acme.test');
    await allowed.text();

    const preflight = await handler(
      new Request('http://localhost/api/chat', {
        method: 'OPTIONS',
        headers: { Origin: 'https://acme.test' },
      }),
    );
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-methods')).toContain('POST');
  });

  it('injects retrieved context and forwards safe metadata to onFinish', async () => {
    const { provider, calls } = recordingProvider(['Grounded']);
    const onFinish = vi.fn();
    const context = vi.fn().mockResolvedValue('Install with npm i @acme/sdk.');
    const handler = createChatHandler({
      provider,
      rateLimit: false,
      systemPrompt: 'You are Acme support.',
      context,
      onFinish,
    });

    const response = await handler(
      request({
        messages: [
          { role: 'user', content: 'Earlier' },
          { role: 'assistant', content: 'Sure' },
          { role: 'user', content: 'How do I install?' },
        ],
        metadata: { userId: 'u_1' },
      }),
    );
    await response.text();

    expect(context).toHaveBeenCalledWith([
      { role: 'user', content: 'Earlier' },
      { role: 'assistant', content: 'Sure' },
      { role: 'user', content: 'How do I install?' },
    ]);
    expect(calls[0]?.system).toContain('You are Acme support.');
    expect(calls[0]?.system).toContain('Install with npm i @acme/sdk.');
    expect(calls[0]?.system).toContain('<documentation_context>');
    await vi.waitFor(() => expect(onFinish).toHaveBeenCalled());
    expect(onFinish.mock.calls[0]?.[0].metadata).toEqual({ userId: 'u_1' });
  });

  it('turns provider failures into a safe SSE error and reports them to onFinish', async () => {
    const onFinish = vi.fn();
    const provider: ChatProvider = {
      async *stream() {
        yield { type: 'text', text: 'partial' };
        throw new Error('secret upstream detail');
      },
    };
    const handler = createChatHandler({ provider, rateLimit: false, onFinish });

    const response = await handler(request({ messages: [{ role: 'user', content: 'Hi' }] }));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('event: error');
    expect(body).not.toContain('secret upstream detail');
    await vi.waitFor(() => expect(onFinish).toHaveBeenCalled());
    expect(onFinish.mock.calls[0]?.[0].status).toBe('error');
  });

  it('returns a clear configuration error when no provider or API key exists', async () => {
    const previous = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const handler = createChatHandler({ rateLimit: false });
      const response = await handler(
        request({ messages: [{ role: 'user', content: 'Hi' }] }),
      );
      expect(response.status).toBe(500);
      const payload = await response.json();
      expect(payload.error.code).toBe('server_misconfigured');
      expect(JSON.stringify(payload)).not.toContain('sk-');
    } finally {
      if (previous === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = previous;
    }
  });
});
