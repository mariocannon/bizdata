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
  /** Whether /media-kit answers. Off until the operator opens it. */
  mediaKitPublished: boolean
  mediaKitSubscribers: number
  /** Whole percent. */
  mediaKitOpenRate: number
  mediaKitContactEmail: string | null
}

/** Blank clears the address rather than storing an empty string. */
const mediaKitEmail = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .refine(
    (v) => v === null || z.string().email().safeParse(v).success,
    'Enter a valid email address'
  )

export const settingsSchema = z.object({
  bulletinCapacity: z.coerce.number().int().min(1).max(20),
  soldOutTarget: z.coerce.number().int().min(1).max(50),
  defaultPrices: z.record(z.enum(AD_TYPES), z.coerce.number().min(0)),
  mediaKitPublished: z.boolean(),
  mediaKitSubscribers: z.coerce.number().int().min(0).max(10_000_000),
  mediaKitOpenRate: z.coerce.number().int().min(0).max(100),
  mediaKitContactEmail: mediaKitEmail,
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
    mediaKitPublished: row.mediaKitPublished,
    mediaKitSubscribers: row.mediaKitSubscribers,
    mediaKitOpenRate: row.mediaKitOpenRate,
    mediaKitContactEmail: row.mediaKitContactEmail,
  }
}

export async function saveSettings(input: AppSettings): Promise<AppSettings> {
  const data = settingsSchema.parse(input)
  const prices = { ...DEFAULT_PRICES, ...data.defaultPrices }

  const row = {
    bulletinCapacity: data.bulletinCapacity,
    soldOutTarget: data.soldOutTarget,
    defaultPrices: JSON.stringify(prices),
    mediaKitPublished: data.mediaKitPublished,
    mediaKitSubscribers: data.mediaKitSubscribers,
    mediaKitOpenRate: data.mediaKitOpenRate,
    mediaKitContactEmail: data.mediaKitContactEmail,
  }

  await prisma.settings.upsert({
    where: { id: 'settings' },
    update: row,
    create: { id: 'settings', ...row },
  })

  return { ...data, defaultPrices: prices }
}
