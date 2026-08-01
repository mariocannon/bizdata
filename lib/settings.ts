import { z } from 'zod'
import { prisma } from '@/lib/db'
import { centsSchema } from '@/lib/money'
import { AD_TYPES, type AdType } from '@/lib/enums'

export const DEFAULT_BULLETIN_CAPACITY = 3
export const DEFAULT_SOLD_OUT_TARGET = 10

/** Integer cents, like every other price in the app (lib/money.ts). */
export const DEFAULT_PRICES: Record<AdType, number> = {
  HEADLINE: 45_000,
  FEATURE: 30_000,
  BULLETIN_CLASSIFIED: 8_000,
  BULLETIN_BANNER: 12_000,
  BULLETIN_TAKEOVER: 30_000,
  SECTION_SPONSOR: 15_000,
  FEATURED_EVENT: 10_000,
}

export type AppSettings = {
  bulletinCapacity: number
  soldOutTarget: number
  defaultPrices: Record<AdType, number>
}

export const settingsSchema = z.object({
  bulletinCapacity: z.coerce.number().int().min(1).max(20),
  soldOutTarget: z.coerce.number().int().min(1).max(50),
  defaultPrices: z.record(z.enum(AD_TYPES), centsSchema),
})

function parsePrices(raw: string): Record<AdType, number> {
  const prices = { ...DEFAULT_PRICES }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    for (const adType of AD_TYPES) {
      const value = Number(parsed[adType])
      // Rounded rather than rejected: a row written before prices moved to
      // cents could still hold a fraction, and a whole cent is a better answer
      // than silently reverting to the default.
      if (Number.isFinite(value) && value >= 0) prices[adType] = Math.round(value)
    }
  } catch {
    // Malformed JSON falls back to defaults rather than breaking every page.
  }
  return prices
}

/** Reads the single settings row, creating it with defaults on first access. */
export async function getSettings(): Promise<AppSettings> {
  const row = await prisma.settings.upsert({
    where: { id: 'settings' },
    update: {},
    create: {
      id: 'settings',
      bulletinCapacity: DEFAULT_BULLETIN_CAPACITY,
      soldOutTarget: DEFAULT_SOLD_OUT_TARGET,
      defaultPrices: JSON.stringify(DEFAULT_PRICES),
    },
  })

  return {
    bulletinCapacity: row.bulletinCapacity,
    soldOutTarget: row.soldOutTarget,
    defaultPrices: parsePrices(row.defaultPrices),
  }
}

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
