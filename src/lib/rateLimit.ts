// In-memory sliding-window rate limiter. Sufficient for a self-hosted
// single-process app. For multi-instance, swap for Redis.

type Bucket = { hits: number[]; lockedUntil: number }
const buckets = new Map<string, Bucket>()

// Periodic cleanup to avoid unbounded growth
setInterval(() => {
  const now = Date.now()
  for (const [key, b] of buckets) {
    if (b.lockedUntil > now) continue
    b.hits = b.hits.filter((t) => now - t < 60 * 60 * 1000)
    if (b.hits.length === 0) buckets.delete(key)
  }
}, 5 * 60 * 1000).unref?.()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter: number // seconds
}

export interface RateLimitOptions {
  windowMs: number
  max: number
  // After hitting max, lock the bucket for this duration (exponential-style)
  lockoutMs?: number
}

export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  let b = buckets.get(key)
  if (!b) { b = { hits: [], lockedUntil: 0 }; buckets.set(key, b) }

  if (b.lockedUntil > now) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((b.lockedUntil - now) / 1000) }
  }

  // Drop hits outside the window
  b.hits = b.hits.filter((t) => now - t < opts.windowMs)

  if (b.hits.length >= opts.max) {
    const lockout = opts.lockoutMs ?? opts.windowMs
    b.lockedUntil = now + lockout
    return { allowed: false, remaining: 0, retryAfter: Math.ceil(lockout / 1000) }
  }

  b.hits.push(now)
  return { allowed: true, remaining: opts.max - b.hits.length, retryAfter: 0 }
}

export function clearRateLimit(key: string) {
  buckets.delete(key)
}

export function clientIp(req: Request): string {
  const h = req.headers
  const fwd = h.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return h.get("x-real-ip") || h.get("cf-connecting-ip") || "unknown"
}
