'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { clearMessages, DEFAULT_STORAGE_KEY, loadMessages, saveMessages } from './storage';
import { isAbortError, streamChat } from './transport';
import {
  AiHelperError,
  type ChatMessage,
  type ChatStatus,
  type UseAiHelperOptions,
  type UseAiHelperResult,
  type WireMessage,
} from './types';
import { createId } from './utils';

function toAssistantError(error: unknown): AiHelperError {
  if (error instanceof AiHelperError) return error;
  if (error instanceof Error) {
    return new AiHelperError('network_error', error.message || 'Something went wrong.', {
      cause: error,
    });
  }
  return new AiHelperError('network_error', 'Something went wrong. Please try again.');
}

function wireMessages(messages: ChatMessage[]): WireMessage[] {
  return messages
    .filter((message) => message.content.length > 0 && !message.interrupted)
    .map(({ role, content }) => ({ role, content }));
}

function withInterrupted(messages: ChatMessage[], id: string): ChatMessage[] {
  return messages.map((message) =>
    message.id === id ? { ...message, interrupted: true } : message,
  );
}

/**
 * Headless chat state: messages, streaming, abort, retry, reset, and persistence.
 * Safe to use without the visual widget.
 */
export function useAiHelper(options: UseAiHelperOptions = {}): UseAiHelperResult {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
  const persist = options.persist !== false;

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    persist ? loadMessages(storageKey) : [],
  );
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [error, setError] = useState<AiHelperError | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  const messagesRef = useRef<ChatMessage[]>(messages);
  const statusRef = useRef<ChatStatus>('idle');
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const commitMessages = useCallback((next: ChatMessage[]) => {
    messagesRef.current = next;
    if (mountedRef.current) setMessages(next);
  }, []);

  const commitStatus = useCallback((next: ChatStatus) => {
    statusRef.current = next;
    if (mountedRef.current) setStatus(next);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const sync = () => {
      const online = typeof navigator === 'undefined' || navigator.onLine !== false;
      if (mountedRef.current) setIsOnline(online);
    };
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!persist) return;
    if (status === 'submitting' || status === 'streaming') return;
    if (messages.length === 0) {
      clearMessages(storageKey);
      return;
    }
    saveMessages(storageKey, messages);
  }, [messages, persist, status, storageKey]);

  const notifyError = useCallback((next: AiHelperError) => {
    if (!mountedRef.current) return;
    setError(next);
    try {
      optionsRef.current.onError?.(next);
    } catch {
      // Consumer callbacks must never break the chat loop.
    }
  }, []);

  const startRequest = useCallback(
    async (history: WireMessage[], assistant: ChatMessage) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setError(null);
      commitStatus('submitting');

      let accumulated = '';
      let gotFirstToken = false;

      try {
        await streamChat({
          endpoint: optionsRef.current.endpoint ?? '/api/chat',
          messages: history,
          metadata: optionsRef.current.metadata,
          headers: optionsRef.current.headers,
          signal: controller.signal,
          onDelta: (text) => {
            accumulated += text;
            if (!gotFirstToken) {
              gotFirstToken = true;
              commitStatus('streaming');
            }
            const next = messagesRef.current.map((message) =>
              message.id === assistant.id
                ? { ...message, content: message.content + text }
                : message,
            );
            commitMessages(next);
          },
        });

        if (controller.signal.aborted) return;

        if (!accumulated.trim()) {
          const emptyError = new AiHelperError(
            'empty_response',
            'The assistant did not return a response. Please try again.',
          );
          commitMessages(messagesRef.current.filter((message) => message.id !== assistant.id));
          commitStatus('error');
          notifyError(emptyError);
          return;
        }

        const finalMessage: ChatMessage = {
          ...assistant,
          content: accumulated,
          interrupted: undefined,
        };
        commitMessages(
          messagesRef.current.map((message) =>
            message.id === assistant.id ? finalMessage : message,
          ),
        );
        commitStatus('idle');
        try {
          optionsRef.current.onMessage?.(finalMessage);
        } catch {
          // Ignore consumer callback failures.
        }
      } catch (caught) {
        if (isAbortError(caught) || controller.signal.aborted) {
          const current = messagesRef.current.find((message) => message.id === assistant.id);
          const next = current?.content.trim()
            ? withInterrupted(messagesRef.current, assistant.id)
            : messagesRef.current.filter((message) => message.id !== assistant.id);
          commitMessages(next);
          commitStatus('idle');
          return;
        }

        const nextError = toAssistantError(caught);
        const current = messagesRef.current.find((message) => message.id === assistant.id);
        const next = current?.content.trim()
          ? withInterrupted(messagesRef.current, assistant.id)
          : messagesRef.current.filter((message) => message.id !== assistant.id);
        commitMessages(next);
        commitStatus('error');
        notifyError(nextError);
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [commitMessages, commitStatus, notifyError],
  );

  const send = useCallback(
    async (rawContent: string) => {
      if (statusRef.current === 'submitting' || statusRef.current === 'streaming') return;
      const content = rawContent.trim();
      if (!content) return;

      const maxLength = optionsRef.current.maxInputLength ?? 4000;
      if (content.length > maxLength) {
        const lengthError = new AiHelperError(
          'input_too_long',
          `Messages are limited to ${maxLength.toLocaleString()} characters.`,
        );
        commitStatus('error');
        notifyError(lengthError);
        return;
      }

      if (
        typeof navigator !== 'undefined' &&
        navigator.onLine === false
      ) {
        const offlineError = new AiHelperError(
          'offline',
          'You appear to be offline. Reconnect and try again.',
        );
        commitStatus('offline');
        notifyError(offlineError);
        return;
      }

      setError(null);
      const userMessage: ChatMessage = {
        id: createId(),
        role: 'user',
        content,
        createdAt: Date.now(),
      };
      const assistant: ChatMessage = {
        id: createId(),
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
      };
      const nextHistory = [...messagesRef.current, userMessage];
      commitMessages([...nextHistory, assistant]);
      try {
        optionsRef.current.onMessage?.(userMessage);
      } catch {
        // Ignore consumer callback failures.
      }
      await startRequest(wireMessages(nextHistory), assistant);
    },
    [commitMessages, commitStatus, notifyError, startRequest],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    commitMessages([]);
    commitStatus('idle');
    setError(null);
    if (persist) clearMessages(storageKey);
  }, [commitMessages, commitStatus, persist, storageKey]);

  const retry = useCallback(() => {
    if (statusRef.current === 'submitting' || statusRef.current === 'streaming') return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const offlineError = new AiHelperError(
        'offline',
        'You appear to be offline. Reconnect and try again.',
      );
      commitStatus('offline');
      notifyError(offlineError);
      return;
    }

    let lastUserIndex = -1;
    for (let i = messagesRef.current.length - 1; i >= 0; i -= 1) {
      if (messagesRef.current[i]?.role === 'user') {
        lastUserIndex = i;
        break;
      }
    }
    if (lastUserIndex === -1) return;

    const history = messagesRef.current.slice(0, lastUserIndex + 1);
    const assistant: ChatMessage = {
      id: createId(),
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
    };
    commitMessages([...history, assistant]);
    void startRequest(wireMessages(history), assistant);
  }, [commitMessages, commitStatus, notifyError, startRequest]);

  return {
    messages,
    send,
    stop,
    reset,
    retry,
    status,
    error,
    isStreaming: status === 'submitting' || status === 'streaming',
    isOnline,
  };
}
