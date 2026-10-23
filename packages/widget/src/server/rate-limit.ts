import type { RateLimitOptions, RateLimitResult, RateLimitStore } from './types';

interface Entry extends RateLimitResult {
  expiresAt: number;
}

/**
 * A small process-local fixed-window limiter. Good for a single instance;
 * use a shared store (Redis/Upstash/KV) when running multiple instances.
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly entries = new Map<string, Entry>();
  private calls = 0;

  hit(key: string, windowMs: number): RateLimitResult {
    const now = Date.now();
    this.calls += 1;
    if (this.calls % 500 === 0) this.prune(now);

    const existing = this.entries.get(key);
    if (!existing || existing.expiresAt <= now) {
      const entry: Entry = { count: 1, resetAt: now + windowMs, expiresAt: now + windowMs };
      this.entries.set(key, entry);
      return { count: entry.count, resetAt: entry.resetAt };
    }

    existing.count += 1;
    return { count: existing.count, resetAt: existing.resetAt };
  }

  private prune(now: number): void {
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }
    if (this.entries.size > 20_000) {
      const oldest = [...this.entries.entries()]
        .sort((a, b) => a[1].expiresAt - b[1].expiresAt)
        .slice(0, this.entries.size - 20_000);
      for (const [key] of oldest) this.entries.delete(key);
    }
  }
}

export const defaultRateLimitStore = new MemoryRateLimitStore();

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-real-ip') ??
    request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export async function checkRateLimit(
  request: Request,
  options: RateLimitOptions | false | undefined,
): Promise<RateLimitDecision> {
  if (options === false) {
    return { allowed: true, limit: 0, remaining: 0, resetAt: 0 };
  }
  const limit = options?.limit ?? 20;
  const windowMs = options?.windowMs ?? 60_000;
  const store = options?.store ?? defaultRateLimitStore;
  const key = options?.key?.(request) ?? getClientIp(request);
  const result = await store.hit(key, windowMs);
  return {
    allowed: result.count <= limit,
    limit,
    remaining: Math.max(0, limit - result.count),
    resetAt: result.resetAt,
  };
}
