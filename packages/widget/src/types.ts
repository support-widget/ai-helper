import type { ReactNode } from 'react';

export type MessageRole = 'user' | 'assistant';

export interface WireMessage {
  role: MessageRole;
  content: string;
}

export interface ChatMessage extends WireMessage {
  id: string;
  createdAt: number;
  /** True when generation was stopped, failed, or the stream ended early. */
  interrupted?: boolean;
}

export type ChatStatus = 'idle' | 'submitting' | 'streaming' | 'error' | 'offline';

export type AiHelperErrorCode =
  | 'offline'
  | 'network_error'
  | 'rate_limited'
  | 'unauthorized'
  | 'invalid_request'
  | 'server_error'
  | 'protocol_error'
  | 'incomplete_stream'
  | 'empty_response'
  | 'input_too_long'
  | 'aborted';

export class AiHelperError extends Error {
  readonly code: AiHelperErrorCode;
  readonly status?: number;
  readonly retryAfter?: string | null;

  constructor(
    code: AiHelperErrorCode,
    message: string,
    options: { status?: number; retryAfter?: string | null; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'AiHelperError';
    this.code = code;
    this.status = options.status;
    this.retryAfter = options.retryAfter ?? null;
  }
}

export interface AiHelperMetadata {
  [key: string]: unknown;
}

export interface UseAiHelperOptions {
  /** Backend route that implements the SSE chat protocol. */
  endpoint?: string;
  /** Additional headers sent with each POST request. */
  headers?: Record<string, string>;
  /** Arbitrary metadata sent with each request (page URL, user id, locale, ...). */
  metadata?: AiHelperMetadata;
  /** Store the conversation in localStorage. Defaults to true. */
  persist?: boolean;
  /** Override the localStorage key. */
  storageKey?: string;
  /** Maximum characters accepted by send(). Defaults to 4000. */
  maxInputLength?: number;
  onMessage?: (message: ChatMessage) => void;
  onError?: (error: AiHelperError) => void;
}

export interface UseAiHelperResult {
  messages: ChatMessage[];
  send: (content: string) => Promise<void>;
  stop: () => void;
  reset: () => void;
  retry: () => void;
  status: ChatStatus;
  error: AiHelperError | null;
  isStreaming: boolean;
  isOnline: boolean;
}

export type AiHelperTheme = 'light' | 'dark' | 'auto';
export type AiHelperPosition = 'bottom-right' | 'bottom-left';

export interface AiHelperProps extends UseAiHelperOptions {
  title?: string;
  subtitle?: string;
  /** Image URL or a React node. Falls back to the title initials. */
  logo?: string | ReactNode;
  welcomeMessage?: string;
  suggestions?: string[];
  position?: AiHelperPosition;
  defaultOpen?: boolean;
  theme?: AiHelperTheme;
  accentColor?: string;
  placeholder?: string;
  /** Pass "inherit" to use the host page's font. */
  fontFamily?: string;
  zIndex?: number;
  /** Name used by the typing indicator. Defaults to a short form of title. */
  assistantName?: string;
  /** Hide chips after the first user message. Defaults to true. */
  hideSuggestionsAfterFirstMessage?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface AiHelperProviderProps {
  children?: ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface AiHelperControls {
  isOpen: boolean;
  openHelper: () => void;
  closeHelper: () => void;
  toggleHelper: () => void;
  setOpen: (open: boolean) => void;
}
