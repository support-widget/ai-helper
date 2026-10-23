export function createId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // Older browsers or insecure contexts can expose crypto without randomUUID.
  }
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function shortAssistantName(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return 'Assistant';
  const withoutHelp = trimmed.replace(/\s+(help|support|assistant)$/i, '').trim();
  return withoutHelp || trimmed;
}

export function initials(value: string): string {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (words.length === 0) return 'AI';
  return words.map((word) => word.charAt(0)).join('').toUpperCase();
}

export function isSafeHref(href: string): boolean {
  const value = href.trim();
  if (!value) return false;
  if (/^(https?:\/\/|mailto:)/i.test(value)) return true;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  if (value.startsWith('#')) return true;
  return false;
}
