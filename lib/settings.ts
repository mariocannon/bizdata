import { cache } from 'react'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { AD_TYPES, type AdType } from '@/lib/enums'

export const DEFAULT_BULLETIN_CAPACITY = 3
export const DEFAULT_SOLD_OUT_TARGET = 10

export const DEFAULT_PRICES: Record<AdType, number> = {
  HEADLINE: 450,
  FEATURE: 300,
  BULLETIN_CLASSIFIED: 80,
  BULLETIN_BANNER: 120,
  BULLETIN_TAKEOVER: 300,
  SECTION_SPONSOR: 150,
  FEATURED_EVENT: 100,
}

export type AppSettings = {
  bulletinCapacity: number
  soldOutTarget: number
  defaultPrices: Record<AdType, number>
}

export const settingsSchema = z.object({
  bulletinCapacity: z.coerce.number().int().min(1).max(20),
  soldOutTarget: z.coerce.number().int().min(1).max(50),
  defaultPrices: z.record(z.enum(AD_TYPES), z.coerce.number().min(0)),
})

/**
 * React's request-scoped memo.
 *
 * `cache` ships only in React's server build, which is the one Next resolves
 * for Server Components and server actions — every caller of `getSettings`. The
 * rule tests import this module transitively under plain Node, where that build
 * isn't resolved and there is no request to scope a cache to anyway, so it
 * degrades to calling straight through.
 */
const perRequest: <T extends (...args: never[]) => unknown>(fn: T) => T =
  typeof cache === 'function' ? cache : (fn) => fn

function parsePrices(raw: string): Record<AdType, number> {
  const prices = { ...DEFAULT_PRICES }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    for (const adType of AD_TYPES) {
      const value = Number(parsed[adType])
      if (Number.isFinite(value) && value >= 0) prices[adType] = value
    }
  } catch {
    // Malformed JSON falls back to defaults rather than breaking every page.
  }
  return prices
}

/**
 * Reads the single settings row, creating it with defaults on first access.
 *
 * Two things keep this cheap, because almost every page needs it:
 *
 * - It reads before it writes. An `upsert` is a write transaction even when the
 *   row already exists, so using one as the read path put a write on the
 *   critical path of every render. The row is created exactly once, on the
 *   first request a deployment ever serves; after that this is a `SELECT`.
 * - It is memoised per request. Several callers on one page each want the
 *   settings — a booking action and the capacity check it runs, for instance —
 *   and they now share a single round trip.
 */
export const getSettings = perRequest(async function getSettings(): Promise<AppSettings> {
  const row =
    (await prisma.settings.findUnique({ where: { id: 'settings' } })) ??
    (await prisma.settings.upsert({
      where: { id: 'settings' },
      update: {},
      create: {
        id: 'settings',
        bulletinCapacity: DEFAULT_BULLETIN_CAPACITY,
        soldOutTarget: DEFAULT_SOLD_OUT_TARGET,
        defaultPrices: JSON.stringify(DEFAULT_PRICES),
      },
    }))

  return {
    bulletinCapacity: row.bulletinCapacity,
    soldOutTarget: row.soldOutTarget,
    defaultPrices: parsePrices(row.defaultPrices),
  }
})

export async function saveSettings(input: AppSettings): Promise<AppSettings> {
  const data = settingsSchema.parse(input)
  const prices = { ...DEFAULT_PRICES, ...data.defaultPrices }

  await prisma.settings.upsert({
    where: { id: 'settings' },
    update: {
      bulletinCapacity: data.bulletinCapacity,
      soldOutTarget: data.soldOutTarget,
      defaultPrices: JSON.stringify(prices),
    },
    create: {
      id: 'settings',
      bulletinCapacity: data.bulletinCapacity,
      soldOutTarget: data.soldOutTarget,
      defaultPrices: JSON.stringify(prices),
    },
  })

  return { ...data, defaultPrices: prices }
}
