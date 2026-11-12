/**
 * Lightweight short-window / explicit-key deduplication helper for protecting
 * grading & session submission endpoints against accidental double-clicks or
 * concurrent duplicate requests without blocking distinct retries.
 */

interface CacheEntry<T> {
  promise: Promise<T>;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 2500;
const inflightAndRecent = new Map<string, CacheEntry<unknown>>();

function cleanupExpired(now: number): void {
  if (inflightAndRecent.size < 200) return;
  for (const [k, entry] of inflightAndRecent.entries()) {
    if (entry.expiresAt <= now) {
      inflightAndRecent.delete(k);
    }
  }
}

export async function runDeduplicatedSubmission<T>(
  dedupeKey: string,
  fn: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  const now = Date.now();
  cleanupExpired(now);

  const existing = inflightAndRecent.get(dedupeKey);
  if (existing && existing.expiresAt > now) {
    return (await existing.promise) as T;
  }

  const promise = fn().catch((err) => {
    // Never cache failures; allow immediate retry
    inflightAndRecent.delete(dedupeKey);
    throw err;
  });

  inflightAndRecent.set(dedupeKey, {
    promise,
    expiresAt: now + ttlMs,
  });

  return await promise;
}

export function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableSerialize(obj[k])}`)
    .join(",")}}`;
}

