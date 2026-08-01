/**
 * Supabase's transaction pooler (port 6543) hands each query whichever backend
 * is free. Prisma's prepared statements live on a single backend, so the second
 * query fails with Postgres 26000, `prepared statement "s1" does not exist`.
 *
 * `pgbouncer=true` tells Prisma not to use prepared statements, and
 * `connection_limit=1` keeps each serverless instance to one connection so
 * concurrent invocations don't exhaust the pool.
 *
 * Getting this wrong breaks every page, and it's a single easily-forgotten
 * query parameter, so the app repairs the URL itself rather than trusting the
 * environment variable to be complete.
 */

const TRANSACTION_POOLER_PORT = '6543'

export function poolerSafeUrl(raw: string | undefined): string | undefined {
  if (!raw) return raw

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    // Not parseable — hand it to Prisma untouched so its own error surfaces.
    return raw
  }

  if (!/^postgres(ql)?:$/.test(url.protocol)) return raw
  if (url.port !== TRANSACTION_POOLER_PORT) return raw

  if (!url.searchParams.has('pgbouncer')) {
    url.searchParams.set('pgbouncer', 'true')
  }
  if (!url.searchParams.has('connection_limit')) {
    url.searchParams.set('connection_limit', '1')
  }

  return url.toString()
}

/** True when the URL was missing settings the transaction pooler needs. */
export function needsPoolerRepair(raw: string | undefined): boolean {
  return Boolean(raw) && poolerSafeUrl(raw) !== raw
}
