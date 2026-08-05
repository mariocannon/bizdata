/**
 * A small fixed-window rate limiter for the one public endpoint.
 *
 * Deliberately in-memory. The app has a single public write path that creates a
 * draft nobody sees until the operator approves it, so the job here is to stop
 * a naive flood, not to be a security boundary — and an in-memory counter needs
 * no extra infrastructure.
 *
 * What that costs: serverless instances each keep their own counter and lose it
 * when they recycle, so the real-world limit is looser than the number below.
 * If submissions ever need a hard limit, this is the seam to move to Postgres
 * or Redis — `check()` is the only thing callers use.
 */

type Window = { count: number; resetAt: number }

const windows = new Map<string, Window>()

export type RateLimitResult = {
  ok: boolean
  /** Seconds until the window resets. 0 when the request is allowed. */
  retryAfter: number
  remaining: number
}

/** Drops windows that have already expired, so the map can't grow unbounded. */
function prune(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key)
  }
}

export function check(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): RateLimitResult {
  prune(now)

  const existing = windows.get(key)

  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0, remaining: limit - 1 }
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      remaining: 0,
    }
  }

  existing.count += 1
  return { ok: true, retryAfter: 0, remaining: limit - existing.count }
}

/** Test seam — the module-level map otherwise leaks between test cases. */
export function reset(): void {
  windows.clear()
}

/**
 * Best-effort client IP. Netlify sets `x-nf-client-connection-ip`; most other
 * proxies set `x-forwarded-for`, whose first entry is the original client.
 * Falls back to a shared bucket, which throttles harder rather than not at all.
 */
export function clientIp(headers: Headers): string {
  const netlify = headers.get('x-nf-client-connection-ip')
  if (netlify) return netlify.trim()

  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }

  return headers.get('x-real-ip')?.trim() || 'unknown'
}
