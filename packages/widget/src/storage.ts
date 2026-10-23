import type { ChatMessage } from './types';

export const DEFAULT_STORAGE_KEY = 'aih:conversation:v1';
const MAX_STORED_MESSAGES = 80;
const MAX_STORED_CHARS = 80_000;

function isMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    (item.role === 'user' || item.role === 'assistant') &&
    typeof item.content === 'string' &&
    typeof item.id === 'string' &&
    typeof item.createdAt === 'number'
  );
}

/** localStorage can throw in private mode, sandboxed iframes, or when quota is full. */
export function loadMessages(storageKey: string): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    let total = 0;
    return parsed
      .filter(isMessage)
      .slice(-MAX_STORED_MESSAGES)
      .filter((message) => {
        if (total + message.content.length > MAX_STORED_CHARS) return false;
        total += message.content.length;
        return true;
      });
  } catch {
    return [];
  }
}

export function saveMessages(storageKey: string, messages: ChatMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)),
    );
  } catch {
    // Storage is a progressive enhancement; never break the chat over it.
  }
}

export function clearMessages(storageKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Ignore.
  }
}
