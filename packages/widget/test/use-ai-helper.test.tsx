import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAiHelper } from '../src/use-ai-helper';
import { completedResponse, jsonResponse, sse } from './helpers';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useAiHelper', () => {
  it('streams assistant deltas and sends the documented request body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completedResponse('Hello', ' world'));
    vi.stubGlobal('fetch', fetchMock);
    const onMessage = vi.fn();

    const { result } = renderHook(() =>
      useAiHelper({
        endpoint: '/custom-chat',
        persist: false,
        metadata: { page: '/' },
        headers: { 'X-Test': 'yes' },
        onMessage,
      }),
    );

    await act(async () => {
      await result.current.send('Hi');
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(result.current.messages.map((message) => message.role)).toEqual(['user', 'assistant']);
    expect(result.current.messages[1]?.content).toBe('Hello world');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/custom-chat');
    expect(JSON.parse(String(init.body))).toEqual({
      messages: [{ role: 'user', content: 'Hi' }],
      metadata: { page: '/' },
    });
    expect(init.headers).toMatchObject({
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
      'X-Test': 'yes',
    });
    expect(onMessage).toHaveBeenCalledTimes(2);
    expect(onMessage.mock.calls[1]?.[0]).toMatchObject({
      role: 'assistant',
      content: 'Hello world',
    });
  });

  it('aborts an in-flight stream without discarding partial text', async () => {
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
    let signal: AbortSignal | undefined;
    const encoder = new TextEncoder();

    const fetchMock = vi.fn().mockImplementation((_input: RequestInfo, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      const stream = new ReadableStream<Uint8Array>({
        start(streamController) {
          controller = streamController;
          init?.signal?.addEventListener(
            'abort',
            () => {
              streamController.error(new DOMException('Aborted', 'AbortError'));
            },
            { once: true },
          );
        },
      });
      return Promise.resolve(
        new Response(stream, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAiHelper({ persist: false }));
    let sendPromise: Promise<void> | undefined;

    act(() => {
      sendPromise = result.current.send('A question');
    });

    await waitFor(() => expect(controller).toBeDefined());
    act(() => {
      controller?.enqueue(encoder.encode(sse('delta', { text: 'Partial answer' })));
    });
    await waitFor(() => expect(result.current.messages[1]?.content).toBe('Partial answer'));

    act(() => result.current.stop());
    await act(async () => {
      await sendPromise;
    });

    expect(signal?.aborted).toBe(true);
    expect(result.current.status).toBe('idle');
    expect(result.current.messages[1]).toMatchObject({
      content: 'Partial answer',
      interrupted: true,
    });
  });

  it('surfaces rate limits and removes an empty assistant placeholder', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        { error: { code: 'rate_limited', message: 'Please slow down.' } },
        { status: 429, headers: { 'Retry-After': '7' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const onError = vi.fn();

    const { result } = renderHook(() => useAiHelper({ persist: false, onError }));

    await act(async () => {
      await result.current.send('Hi');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error?.code).toBe('rate_limited');
    expect(result.current.error?.retryAfter).toBe('7');
    expect(result.current.messages).toHaveLength(1);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'rate_limited' }));
  });

  it('retries the last user message after a server error', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { code: 'server_error', message: 'Upstream failed.' } },
          { status: 500 },
        ),
      )
      .mockResolvedValueOnce(completedResponse('Recovered'));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAiHelper({ persist: false }));

    await act(async () => {
      await result.current.send('Please help');
    });
    expect(result.current.error?.code).toBe('server_error');

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.status).toBe('idle'));
    expect(result.current.messages.map((message) => message.content)).toEqual([
      'Please help',
      'Recovered',
    ]);
  });

  it('treats a stream without a done event as interrupted', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode(sse('delta', { text: 'Cut off here' })),
              );
              controller.close();
            },
          }),
          { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
        ),
      ),
    );

    const { result } = renderHook(() => useAiHelper({ persist: false }));
    await act(async () => {
      await result.current.send('Hi');
    });

    expect(result.current.error?.code).toBe('incomplete_stream');
    expect(result.current.status).toBe('error');
    expect(result.current.messages[1]).toMatchObject({
      content: 'Cut off here',
      interrupted: true,
    });
  });

  it('persists and restores complete messages with try/catch-safe storage', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(completedResponse('Saved answer')));
    const first = renderHook(() =>
      useAiHelper({ persist: true, storageKey: 'aih-test-conversation' }),
    );

    await act(async () => {
      await first.result.current.send('Save me');
    });
    await waitFor(() => {
      const raw = window.localStorage.getItem('aih-test-conversation');
      expect(raw).toBeTruthy();
      expect(JSON.parse(raw ?? '[]')).toHaveLength(2);
    });

    first.unmount();
    const second = renderHook(() =>
      useAiHelper({ persist: true, storageKey: 'aih-test-conversation' }),
    );
    expect(second.result.current.messages.map((message) => message.content)).toEqual([
      'Save me',
      'Saved answer',
    ]);
  });

  it('reports offline before making a request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { result } = renderHook(() => useAiHelper({ persist: false }));

    await act(async () => {
      await result.current.send('Hi');
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.error?.code).toBe('offline');
    expect(result.current.status).toBe('offline');
  });

  it('resets the conversation and local storage', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(completedResponse('Hi there')));
    const { result } = renderHook(() =>
      useAiHelper({ persist: true, storageKey: 'aih-reset-test' }),
    );
    await act(async () => {
      await result.current.send('Hello');
    });

    act(() => result.current.reset());

    expect(result.current.messages).toEqual([]);
    expect(result.current.status).toBe('idle');
    expect(window.localStorage.getItem('aih-reset-test')).toBeNull();
  });
});
