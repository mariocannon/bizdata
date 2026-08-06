import { z } from 'zod'

export const AD_TYPES = [
  'HEADLINE',
  'FEATURE',
  'BULLETIN_CLASSIFIED',
  'BULLETIN_BANNER',
  'BULLETIN_TAKEOVER',
  'SECTION_SPONSOR',
  'FEATURED_EVENT',
] as const

export const SECTION_SLOTS = [
  'WEATHER',
  'WHATS_ON',
  'GIGS',
  'SPORTS',
  'PET_OF_THE_WEEK',
  'DIGEST',
] as const

export const ADVERTISER_CATEGORIES = [
  'REAL_ESTATE',
  'TRADES',
  'MARINE',
  'HOME_LIFESTYLE',
  'HEALTH_SERVICES',
  'FAMILY',
  'RETAIL_LARGE',
  'DEVELOPER',
  'OTHER',
] as const

export const ADVERTISER_STATUSES = [
  'PROSPECT',
  'PITCHED',
  'WON',
  'ACTIVE',
  'PAUSED',
  'LOST',
] as const

export const BOOKING_STATUSES = ['RESERVED', 'CONFIRMED', 'RAN', 'CANCELLED'] as const
export const PAID_STATUSES = ['UNPAID', 'INVOICED', 'PAID'] as const
export const ISSUE_STATUSES = ['PLANNING', 'DRAFTING', 'READY', 'SENT'] as const

export const CLASSIFIED_CATEGORIES = [
  'FOR_SALE',
  'WANTED',
  'SERVICES',
  'JOBS',
  'PROPERTY',
  'COMMUNITY',
  'OTHER',
] as const

export const CLASSIFIED_STATUSES = ['DRAFT', 'APPROVED', 'PUBLISHED', 'ARCHIVED'] as const

/** Where a classified came from: typed in by the operator, or sent in through
 * the public form at /submit. */
export const CLASSIFIED_SOURCES = ['STAFF', 'PUBLIC'] as const

export const EVENT_CATEGORIES = [
  'MUSIC',
  'MARKET',
  'SPORT',
  'ARTS',
  'FOOD',
  'FUNDRAISER',
  'FAMILY',
  'COMMUNITY',
  'OTHER',
] as const

/** Same shape as classifieds: draft, approved, published, archived. */
export const EVENT_STATUSES = ['DRAFT', 'APPROVED', 'PUBLISHED', 'ARCHIVED'] as const

export type AdType = (typeof AD_TYPES)[number]
export type SectionSlot = (typeof SECTION_SLOTS)[number]
export type AdvertiserCategory = (typeof ADVERTISER_CATEGORIES)[number]
export type AdvertiserStatus = (typeof ADVERTISER_STATUSES)[number]
export type BookingStatus = (typeof BOOKING_STATUSES)[number]
export type PaidStatus = (typeof PAID_STATUSES)[number]
export type IssueStatus = (typeof ISSUE_STATUSES)[number]
export type ClassifiedCategory = (typeof CLASSIFIED_CATEGORIES)[number]
export type ClassifiedStatus = (typeof CLASSIFIED_STATUSES)[number]
export type ClassifiedSource = (typeof CLASSIFIED_SOURCES)[number]
export type EventCategory = (typeof EVENT_CATEGORIES)[number]
export type EventStatus = (typeof EVENT_STATUSES)[number]

export const adTypeSchema = z.enum(AD_TYPES)
export const sectionSlotSchema = z.enum(SECTION_SLOTS)
export const advertiserCategorySchema = z.enum(ADVERTISER_CATEGORIES)
export const advertiserStatusSchema = z.enum(ADVERTISER_STATUSES)
export const bookingStatusSchema = z.enum(BOOKING_STATUSES)
export const paidStatusSchema = z.enum(PAID_STATUSES)
export const issueStatusSchema = z.enum(ISSUE_STATUSES)
export const classifiedCategorySchema = z.enum(CLASSIFIED_CATEGORIES)
export const classifiedStatusSchema = z.enum(CLASSIFIED_STATUSES)
export const classifiedSourceSchema = z.enum(CLASSIFIED_SOURCES)
export const eventCategorySchema = z.enum(EVENT_CATEGORIES)
export const eventStatusSchema = z.enum(EVENT_STATUSES)

/** Human-readable labels for every enumerated value, keyed by raw value. */
export const LABELS: Record<string, string> = {
  // Ad types
  HEADLINE: 'Headline',
  FEATURE: 'Feature',
  BULLETIN_CLASSIFIED: 'Bulletin – Classified',
  BULLETIN_BANNER: 'Bulletin – Banner',
  BULLETIN_TAKEOVER: 'Bulletin Takeover',
  SECTION_SPONSOR: 'Section Sponsor',
  FEATURED_EVENT: 'Featured Event',

  // Section slots
  WEATHER: 'Weather',
  WHATS_ON: "What's On",
  GIGS: 'Gigs',
  SPORTS: 'Sports',
  PET_OF_THE_WEEK: 'Pet of the Week',
  DIGEST: 'Digest',

  // Advertiser categories
  REAL_ESTATE: 'Real Estate',
  TRADES: 'Trades',
  MARINE: 'Marine',
  HOME_LIFESTYLE: 'Home & Lifestyle',
  HEALTH_SERVICES: 'Health & Services',
  FAMILY: 'Family',
  RETAIL_LARGE: 'Retail (Large)',
  DEVELOPER: 'Developer',
  OTHER: 'Other',

  // Advertiser statuses
  PROSPECT: 'Prospect',
  PITCHED: 'Pitched',
  WON: 'Won',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  LOST: 'Lost',

  // Booking statuses
  RESERVED: 'Reserved',
  CONFIRMED: 'Confirmed',
  RAN: 'Ran',
  CANCELLED: 'Cancelled',

  // Paid statuses
  UNPAID: 'Unpaid',
  INVOICED: 'Invoiced',
  PAID: 'Paid',

  // Issue statuses
  PLANNING: 'Planning',
  DRAFTING: 'Drafting',
  READY: 'Ready',
  SENT: 'Sent',

  // Classified categories
  FOR_SALE: 'For sale',
  WANTED: 'Wanted',
  SERVICES: 'Services',
  JOBS: 'Jobs',
  PROPERTY: 'Property',
  COMMUNITY: 'Community',

  // Event categories (FAMILY, COMMUNITY and OTHER reuse the labels above)
  MUSIC: 'Music',
  MARKET: 'Market',
  SPORT: 'Sport',
  ARTS: 'Arts',
  FOOD: 'Food & Drink',
  FUNDRAISER: 'Fundraiser',

  // Classified sources
  STAFF: 'Added by you',
  PUBLIC: 'Submitted',

  // Classified statuses
  DRAFT: 'Draft',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
}

/** Safe label lookup — falls back to the raw value if it isn't a known enum. */
export function label(value: string | null | undefined): string {
  if (!value) return '—'
  return LABELS[value] ?? value
}

/** Capacity groups an ad type can consume. */
export const AD_TYPE_GROUP = {
  HEADLINE: 'headline',
  FEATURE: 'feature',
  BULLETIN_CLASSIFIED: 'bulletin',
  BULLETIN_BANNER: 'bulletin',
  BULLETIN_TAKEOVER: 'bulletin',
  SECTION_SPONSOR: 'section',
  FEATURED_EVENT: 'featuredEvent',
} as const satisfies Record<AdType, string>

export type CapacityGroup = (typeof AD_TYPE_GROUP)[AdType]

export const BULLETIN_AD_TYPES: AdType[] = [
  'BULLETIN_CLASSIFIED',
  'BULLETIN_BANNER',
  'BULLETIN_TAKEOVER',
]
