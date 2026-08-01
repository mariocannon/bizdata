import { PrismaClient } from '@prisma/client'
import { poolerSafeUrl, needsPoolerRepair } from '@/lib/db-url'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

const url = poolerSafeUrl(process.env.DATABASE_URL)

if (needsPoolerRepair(process.env.DATABASE_URL)) {
  // Worth saying out loud: the deployment is running on a repaired URL, and the
  // environment variable itself should be corrected.
  console.warn(
    'DATABASE_URL points at the transaction pooler without pgbouncer=true. ' +
      'Added it (and connection_limit=1) for this process — set them on the ' +
      'variable so the configuration is explicit.'
  )
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(url ? { datasources: { db: { url } } } : {}),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
