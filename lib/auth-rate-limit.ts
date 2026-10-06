import "server-only";

import { headers } from "next/headers";

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
};

const globalForRateLimit = globalThis as unknown as {
  authRateLimitBuckets?: Map<string, Bucket>;
};

const buckets = globalForRateLimit.authRateLimitBuckets ?? new Map<string, Bucket>();
if (!globalForRateLimit.authRateLimitBuckets) {
  globalForRateLimit.authRateLimitBuckets = buckets;
}

async function getClientAddress() {
  const requestHeaders = await headers();

  // Prefer the proxy-provided real IP. If it is unavailable, use the
  // right-most X-Forwarded-For hop because reverse proxies append the
  // address they received rather than trusting a client-supplied first hop.
  const realIp = requestHeaders.get("x-real-ip")?.trim();
  const forwardedFor = requestHeaders
    .get("x-forwarded-for")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const forwarded = forwardedFor?.at(-1);

  return (realIp || forwarded || "unknown").slice(0, 128);
}

function pruneExpired(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export async function consumeAuthRateLimit(options: RateLimitOptions) {
  const now = Date.now();
  pruneExpired(now);
  const address = await getClientAddress();
  const normalizedIdentifier = options.identifier.trim().toLowerCase().slice(0, 320);
  const key = `${options.scope}:${address}:${normalizedIdentifier}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true as const, retryAfterSeconds: 0 };
  }

  if (current.count >= options.limit) {
    return {
      allowed: false as const,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true as const, retryAfterSeconds: 0 };
}

export async function resetAuthRateLimit(scope: string, identifier: string) {
  const address = await getClientAddress();
  const normalizedIdentifier = identifier.trim().toLowerCase().slice(0, 320);
  buckets.delete(`${scope}:${address}:${normalizedIdentifier}`);
}
