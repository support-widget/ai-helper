export type ChatRole = 'user' | 'assistant';

export interface ServerMessage {
  role: ChatRole;
  content: string;
}

export interface ProviderInput {
  messages: ServerMessage[];
  system: string;
  maxTokens: number;
  model: string;
  signal?: AbortSignal;
}

export type ProviderStreamEvent =
  | { type: 'text'; text: string }
  | { type: 'done'; finishReason?: string; usage?: unknown };

export interface ChatProvider {
  name?: string;
  stream(input: ProviderInput): AsyncIterable<ProviderStreamEvent>;
}

export interface RateLimitResult {
  count: number;
  resetAt: number;
}

export interface RateLimitStore {
  hit(key: string, windowMs: number): RateLimitResult | Promise<RateLimitResult>;
}

export interface RateLimitOptions {
  /** Maximum requests in the window. Defaults to 20. */
  limit?: number;
  /** Window length in milliseconds. Defaults to 60,000. */
  windowMs?: number;
  /** Plug in Redis, Upstash, Cloudflare KV, etc. */
  store?: RateLimitStore;
  /** Override how a request is keyed. Defaults to the best available client IP. */
  key?: (request: Request) => string;
}

export interface FinishInfo {
  status: 'done' | 'error' | 'aborted';
  model: string;
  messages: ServerMessage[];
  metadata: Record<string, unknown>;
  responseChars: number;
  durationMs: number;
  usage?: unknown;
  error?: unknown;
}

export interface CreateChatHandlerOptions {
  /** Defaults to process.env.ANTHROPIC_API_KEY. */
  apiKey?: string;
  /** Defaults to process.env.AI_HELPER_MODEL, then the built-in model. */
  model?: string;
  /** Optional Anthropic-compatible base URL (proxies, gateways). */
  baseURL?: string;
  /** Replaces the guardrailed default prompt. Context is still appended. */
  systemPrompt?: string;
  /** Defaults to 700. */
  maxTokens?: number;
  /** Defaults to 20. */
  maxMessages?: number;
  /** Maximum conversation characters, defaults to 16,000. */
  maxInputChars?: number;
  /** Allow browser calls only from these origins. Missing Origin headers are allowed. */
  allowedOrigins?: string[];
  /** Defaults to 20 requests per minute, keyed by IP. Set false to disable. */
  rateLimit?: RateLimitOptions | false;
  /** Inject retrieved documentation on every turn. */
  context?: (messages: ServerMessage[]) => Promise<string> | string;
  /** Log completion stats here. Never log the apiKey. */
  onFinish?: (info: FinishInfo) => void | Promise<void>;
  /** Bring your own provider (tests, OpenAI, local models, ...). */
  provider?: ChatProvider;
}

export interface ProviderOptions {
  apiKey: string;
  baseURL?: string;
  maxRetries?: number;
}
