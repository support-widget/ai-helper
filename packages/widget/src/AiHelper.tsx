'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  AlertIcon,
  ArrowDownIcon,
  ChatIcon,
  CloseIcon,
  MinimizeIcon,
  PlusIcon,
  RetryIcon,
  SendIcon,
  StopIcon,
} from './icons';
import { Markdown } from './markdown';
import { useAiHelperUi } from './provider';
import { WIDGET_STYLES } from './styles';
import type { AiHelperError, AiHelperProps, ChatMessage } from './types';
import { useAiHelper } from './use-ai-helper';
import { cn, initials, shortAssistantName } from './utils';

type RootStyle = CSSProperties & Record<`--${string}`, string | number>;

function Avatar({
  logo,
  title,
  className,
}: {
  logo?: string | ReactNode;
  title: string;
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [logo]);
  const source = typeof logo === 'string' ? logo : null;

  if (logo !== undefined && typeof logo !== 'string') {
    return <span className={className}>{logo}</span>;
  }
  if (source && !imageFailed) {
    return (
      <span className={className}>
        <img src={source} alt="" aria-hidden="true" onError={() => setImageFailed(true)} />
      </span>
    );
  }
  return (
    <span className={className} aria-hidden="true">
      {initials(title)}
    </span>
  );
}

function errorTitle(error: AiHelperError): string {
  switch (error.code) {
    case 'rate_limited':
      return 'A quick breather';
    case 'offline':
      return "You're offline";
    case 'unauthorized':
      return 'Chat is unavailable';
    case 'network_error':
      return 'Connection problem';
    case 'incomplete_stream':
      return 'Response interrupted';
    default:
      return 'Something went wrong';
  }
}

function errorCopy(error: AiHelperError): string {
  if (error.code === 'rate_limited') {
    return error.retryAfter
      ? `Too many messages. Try again in ${error.retryAfter} seconds.`
      : error.message;
  }
  return error.message;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function ScrollButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="aih-scroll-bottom"
      onClick={onClick}
      aria-label="Scroll to latest message"
      title="Scroll to latest message"
    >
      <ArrowDownIcon />
    </button>
  );
}

export function AiHelper({
  endpoint = '/api/chat',
  title = 'AI helper',
  subtitle = 'Usually replies at once',
  logo,
  welcomeMessage = 'Hi! Ask me anything about this site.',
  suggestions = [],
  position = 'bottom-right',
  defaultOpen = false,
  theme = 'dark',
  accentColor,
  persist = true,
  placeholder = 'Ask a question',
  headers,
  metadata,
  onOpenChange,
  onMessage,
  onError,
  fontFamily,
  zIndex = 2_147_483_000,
  assistantName,
  hideSuggestionsAfterFirstMessage = true,
  storageKey,
  maxInputLength = 4000,
}: AiHelperProps) {
  const shadowUi = useAiHelperUi();
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const isOpen = shadowUi?.isOpen ?? localOpen;

  const [mount, setMount] = useState<HTMLElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState('');
  const [unread, setUnread] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const panelRef = useRef<HTMLElement | null>(null);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const nearBottomRef = useRef(true);
  const lastMessageCountRef = useRef(0);
  const isOpenRef = useRef(isOpen);
  const wasOpenRef = useRef(false);
  const previousOpenRef = useRef(isOpen);
  const titleId = useId();
  const panelId = useId();

  isOpenRef.current = isOpen;

  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const callbacksRef = useRef({ onMessage, onError });
  callbacksRef.current = { onMessage, onError };

  const setOpen = useCallback(
    (next: boolean) => {
      if (shadowUi) shadowUi.setOpen(next);
      else setLocalOpen(next);
    },
    [shadowUi],
  );

  useEffect(() => {
    if (previousOpenRef.current === isOpen) return;
    previousOpenRef.current = isOpen;
    try {
      onOpenChangeRef.current?.(isOpen);
    } catch {
      // Host callbacks must not break the widget.
    }
  }, [isOpen]);

  const handleMessage = useCallback((message: ChatMessage) => {
    if (message.role === 'assistant' && !isOpenRef.current) setUnread(true);
    try {
      callbacksRef.current.onMessage?.(message);
    } catch {
      // Host callbacks must not break the widget.
    }
  }, []);

  const handleError = useCallback((error: AiHelperError) => {
    try {
      callbacksRef.current.onError?.(error);
    } catch {
      // Host callbacks must not break the widget.
    }
  }, []);

  const helper = useAiHelper({
    endpoint,
    headers,
    metadata,
    persist,
    storageKey,
    maxInputLength,
    onMessage: handleMessage,
    onError: handleError,
  });

  useEffect(() => {
    const host = document.createElement('div');
    host.setAttribute('data-ai-helper', '');
    host.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:${zIndex};`;
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.setAttribute('data-ai-helper-styles', '');
    style.textContent = WIDGET_STYLES;
    const target = document.createElement('div');
    target.setAttribute('data-ai-helper-mount', '');
    shadow.append(style, target);
    document.body.appendChild(host);
    hostRef.current = host;
    setMount(target);

    return () => {
      host.remove();
      hostRef.current = null;
    };
    // The host is intentionally created once. zIndex is updated below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hostRef.current) hostRef.current.style.zIndex = String(zIndex);
  }, [zIndex]);

  useEffect(() => {
    if (!isOpen) {
      setUnread(false);
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        window.requestAnimationFrame(() => launcherRef.current?.focus());
      }
      return;
    }
    wasOpenRef.current = true;
    setUnread(false);
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, mount]);

  useLayoutEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 96)}px`;
  }, [draft, isOpen, mount]);

  useLayoutEffect(() => {
    const list = messagesRef.current;
    if (!list || !isOpen) return;
    if (!nearBottomRef.current) return;
    const changedCount = helper.messages.length !== lastMessageCountRef.current;
    list.scrollTo({
      top: list.scrollHeight,
      behavior: changedCount && !prefersReducedMotion() ? 'smooth' : 'auto',
    });
    lastMessageCountRef.current = helper.messages.length;
    setShowScrollButton(false);
  }, [helper.messages, helper.status, helper.error, isOpen, mount]);

  const handleScroll = useCallback(() => {
    const list = messagesRef.current;
    if (!list) return;
    const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 72;
    nearBottomRef.current = nearBottom;
    setShowScrollButton(!nearBottom && helper.messages.length > 0);
  }, [helper.messages.length]);

  const scrollToBottom = useCallback(() => {
    const list = messagesRef.current;
    if (!list) return;
    nearBottomRef.current = true;
    list.scrollTo({
      top: list.scrollHeight,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
    setShowScrollButton(false);
  }, []);

  const sendMessage = useCallback(
    (raw: string) => {
      const content = raw.trim();
      if (!content || helper.isStreaming) return;
      nearBottomRef.current = true;
      setDraft('');
      void helper.send(content);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    },
    [helper],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(draft);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      sendMessage(draft);
    }
  };

  const handlePanelKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
  };

  const handleNewChat = () => {
    helper.reset();
    setDraft('');
    setUnread(false);
    nearBottomRef.current = true;
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const assistant = assistantName ?? shortAssistantName(title);
  const showSuggestions =
    suggestions.length > 0 &&
    (!hideSuggestionsAfterFirstMessage || !helper.messages.some((m) => m.role === 'user'));
  const lastMessage = helper.messages[helper.messages.length - 1];
  const showTyping =
    helper.isStreaming && (!lastMessage || lastMessage.role !== 'assistant' || !lastMessage.content);
  const canSend = draft.trim().length > 0 && !helper.isStreaming;
  const hasUserMessages = helper.messages.some((m) => m.role === 'user');

  const style: RootStyle = {};
  if (accentColor) style['--aih-accent'] = accentColor;
  if (fontFamily) style.fontFamily = fontFamily === 'inherit' ? 'inherit' : fontFamily;

  if (!mount) return null;

  const panel = isOpen ? (
    <section
      ref={panelRef}
      id={panelId}
      className="aih-panel"
      role="dialog"
      aria-label={`${title} chat`}
      aria-describedby={titleId}
      onKeyDown={handlePanelKeyDown}
    >
      <header className="aih-header">
        <Avatar logo={logo} title={title} className="aih-avatar" />
        <div className="aih-header-copy">
          <div className="aih-title" id={titleId}>
            {title}
          </div>
          <div className="aih-subtitle">
            <span className={cn('aih-status-dot', !helper.isOnline && 'is-offline')} />
            <span>{helper.isOnline ? subtitle : 'Offline'}</span>
          </div>
        </div>
        <div className="aih-header-actions">
          <button
            type="button"
            className="aih-icon-btn is-new-chat"
            onClick={handleNewChat}
            aria-label="Start a new chat"
            title="New chat"
          >
            <PlusIcon />
          </button>
          <button
            type="button"
            className="aih-icon-btn"
            onClick={() => setOpen(false)}
            aria-label="Minimize chat"
            title="Minimize"
          >
            <MinimizeIcon />
          </button>
          <button
            type="button"
            className="aih-icon-btn"
            onClick={() => setOpen(false)}
            aria-label="Close chat"
            title="Close"
          >
            <CloseIcon />
          </button>
        </div>
      </header>

      <div className="aih-messages-wrap">
        <div
          ref={messagesRef}
          className="aih-messages"
          aria-live="polite"
          aria-relevant="additions text"
          aria-busy={helper.isStreaming}
          aria-label="Conversation"
          onScroll={handleScroll}
        >
          {helper.messages.length === 0 ? (
            <div className="aih-welcome">
              <Avatar logo={logo} title={title} className="aih-welcome-orb" />
              <h2>{assistant}</h2>
              <p>{welcomeMessage}</p>
            </div>
          ) : (
            helper.messages.map((message) => {
              if (message.role === 'assistant' && !message.content) return null;
              const isStreamingMessage =
                message.role === 'assistant' &&
                helper.isStreaming &&
                message.id === lastMessage?.id;
              return (
                <div key={message.id} className={cn('aih-message', message.role)}>
                  <div className={cn('aih-bubble', isStreamingMessage && 'is-streaming')}>
                    {message.role === 'assistant' ? (
                      <Markdown content={message.content} />
                    ) : (
                      message.content
                    )}
                    {isStreamingMessage ? (
                      <span className="aih-stream-caret" aria-hidden="true" />
                    ) : null}
                  </div>
                  {message.interrupted ? (
                    <span className="aih-message-meta">Response interrupted</span>
                  ) : null}
                </div>
              );
            })
          )}

          {showTyping ? (
            <div className="aih-typing" role="status" aria-live="polite">
              <span className="aih-typing-name">{assistant}</span>
              <span>is typing</span>
              <span className="aih-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </div>
          ) : null}

          {helper.error ? (
            <div className="aih-error" role="alert">
              <AlertIcon className="aih-error-icon" />
              <div className="aih-error-copy">
                <div className="aih-error-title">{errorTitle(helper.error)}</div>
                <div className="aih-error-message">{errorCopy(helper.error)}</div>
                {hasUserMessages ? (
                  <button type="button" className="aih-retry" onClick={helper.retry}>
                    <RetryIcon />
                    Retry
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {showScrollButton ? <ScrollButton onClick={scrollToBottom} /> : null}
      </div>

      {showSuggestions ? (
        <div className="aih-suggestions" aria-label="Suggested questions">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="aih-chip"
              onClick={() => sendMessage(suggestion)}
              disabled={helper.isStreaming}
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      <form className="aih-composer" onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          className="aih-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          rows={1}
          maxLength={maxInputLength}
          aria-label="Ask a question"
          autoComplete="off"
        />
        {helper.isStreaming ? (
          <button
            type="button"
            className="aih-stop"
            onClick={helper.stop}
            aria-label="Stop generating"
            title="Stop generating"
          >
            <StopIcon />
          </button>
        ) : null}
        <button
          type="submit"
          className="aih-send"
          disabled={!canSend}
          aria-label="Send message"
          title="Send message"
        >
          <SendIcon />
        </button>
      </form>
    </section>
  ) : null;

  return createPortal(
    <div
      className="aih-root"
      data-theme={theme}
      data-position={position}
      data-open={isOpen ? 'true' : 'false'}
      style={style}
    >
      <button
        ref={launcherRef}
        type="button"
        className="aih-launcher"
        data-open={isOpen ? 'true' : 'false'}
        onClick={() => setOpen(!isOpen)}
        aria-label={`${isOpen ? 'Close' : 'Open'} ${title}${unread ? ' — new reply' : ''}`}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        aria-haspopup="dialog"
      >
        <span className="aih-launcher-icons">
          <ChatIcon className="aih-launcher-icon is-chat" />
          <CloseIcon className="aih-launcher-icon is-close" />
        </span>
        {unread ? <span className="aih-unread" aria-hidden="true" /> : null}
      </button>
      {panel}
    </div>,
    mount,
  );
}
