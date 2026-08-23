import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requestCache } from '@/lib/request-cache'
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
 * Read first, write only when the row is genuinely missing. The obvious
 * spelling of this is `upsert({ update: {} })`, but that is a write on every
 * call — a transaction, a WAL record and a round trip on the pooled connection,
 * on a row that changes about once a year. Every page in the app reads settings,
 * so that one line put a write in front of every render.
 *
 * `requestCache` then collapses the repeat calls within a single render: the
 * dashboard asks for settings directly and again through the capacity report,
 * and both now share one query.
 */
export const getSettings = requestCache(async function getSettings(): Promise<AppSettings> {
  const existing = await prisma.settings.findUnique({ where: { id: 'settings' } })

  const row =
    existing ??
    // First run on a fresh database. `create` can lose a race with a concurrent
    // first request, so fall back to re-reading rather than failing the page.
    (await prisma.settings
      .create({
        data: {
          id: 'settings',
          bulletinCapacity: DEFAULT_BULLETIN_CAPACITY,
          soldOutTarget: DEFAULT_SOLD_OUT_TARGET,
          defaultPrices: JSON.stringify(DEFAULT_PRICES),
        },
      })
      .catch(() => prisma.settings.findUniqueOrThrow({ where: { id: 'settings' } })))

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
