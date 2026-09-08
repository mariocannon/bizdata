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

/**
 * The Hibiscus Coast business directory (thetidelanding's
 * /hibiscus-coast-business-directory). Deliberately lowercase-hyphen slugs
 * rather than this file's usual UPPER_SNAKE — these are used as-is as
 * thetidelanding's URL segment for each category page and stored on
 * DirectoryListing.category verbatim, so don't transform them. Categories,
 * taxonomy and SEO copy stay hand-kept in thetidelanding; this list only has
 * to match its slugs, not own them. Order is display order.
 */
export const DIRECTORY_CATEGORIES = [
  'cafes',
  'plumbers',
  'electricians',
  'mechanics',
  'hairdressers',
  'restaurants',
  'builders',
  'painters',
  'landscaping',
  'real-estate',
  'dentists',
  'beauty',
  'physio',
  'vets',
  'gyms',
  'childcare',
  'cleaners',
  'movers',
  'accountants',
] as const

/**
 * DirectoryListing's workflow — two states, not Classified/Event's four:
 * this is evergreen website content with no issue/newsletter lifecycle to
 * move through.
 *
 *   PENDING   a public submission awaiting operator review. Not shown on
 *             the public site. There is no REJECTED — rejecting one is
 *             just deleting the row.
 *   PUBLISHED live on the public site. The default, so a staff-added
 *             listing goes live immediately, same as before this existed.
 *
 * Source reuses `CLASSIFIED_SOURCES` below rather than a duplicate enum —
 * "who added this" is the same STAFF/PUBLIC choice on every listing type.
 */
export const DIRECTORY_LISTING_STATUSES = ['PENDING', 'PUBLISHED'] as const

/**
 * Towns a directory listing can be tagged with, matching thetidelanding's
 * towns list exactly — coast order (not alphabetical, not north-to-south).
 * Already display-ready, so unlike the other unions here there is no LABELS
 * entry for these.
 */
export const DIRECTORY_TOWNS = [
  'Orewa',
  'Whangaparāoa',
  'Silverdale',
  'Red Beach',
  'Millwater',
  'Stanmore Bay',
  'Manly',
  'Gulf Harbour',
  'Arkles Bay',
  'Hatfields Beach',
] as const

/**
 * "Hibiscus Coast Jobs" — a paid job listing (model Job). A Job reuses
 * CLASSIFIED_SOURCES for source, PAID_STATUSES for paid, and DIRECTORY_TOWNS
 * for town; only the hire-specific unions are new.
 *
 * There is deliberately no childcare / babysitting / in-home-care category:
 * those roles are excluded from the board (operator decision, 8 Sep 2026), so
 * the taxonomy gives them no home and moderation catches anything filed under
 * OTHER or HEALTH.
 */
export const JOB_CATEGORIES = [
  'HOSPITALITY',
  'RETAIL',
  'TRADES',
  'CONSTRUCTION',
  'OFFICE_ADMIN',
  'HEALTH',
  'EDUCATION',
  'DRIVING_LOGISTICS',
  'PROFESSIONAL',
  'OTHER',
] as const

export const JOB_TYPES = [
  'CASUAL',
  'PART_TIME',
  'FULL_TIME',
  'FIXED_TERM',
  'CONTRACT',
] as const

/** Same four-step lifecycle as a classified. */
export const JOB_STATUSES = ['DRAFT', 'APPROVED', 'PUBLISHED', 'ARCHIVED'] as const

/**
 * What the employer bought. The tier picks the default price (lib/jobs.ts
 * JOB_PRICES / priceForTier), which is then snapshotted onto Job.price — the
 * tier is "which product", Job.price is "what they were charged".
 */
export const JOB_TIERS = ['STANDARD', 'FEATURED', 'COMMUNITY'] as const

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
export type DirectoryCategory = (typeof DIRECTORY_CATEGORIES)[number]
export type DirectoryListingStatus = (typeof DIRECTORY_LISTING_STATUSES)[number]
export type DirectoryTown = (typeof DIRECTORY_TOWNS)[number]
export type JobCategory = (typeof JOB_CATEGORIES)[number]
export type JobType = (typeof JOB_TYPES)[number]
export type JobStatus = (typeof JOB_STATUSES)[number]
export type JobTier = (typeof JOB_TIERS)[number]

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
export const directoryCategorySchema = z.enum(DIRECTORY_CATEGORIES)
export const directoryListingStatusSchema = z.enum(DIRECTORY_LISTING_STATUSES)
export const directoryTownSchema = z.enum(DIRECTORY_TOWNS)
export const jobCategorySchema = z.enum(JOB_CATEGORIES)
export const jobTypeSchema = z.enum(JOB_TYPES)
export const jobStatusSchema = z.enum(JOB_STATUSES)
export const jobTierSchema = z.enum(JOB_TIERS)

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

  // DirectoryListing status (PUBLISHED reuses the label above)
  PENDING: 'Awaiting review',

  // Job categories (TRADES, OTHER reuse the labels above)
  HOSPITALITY: 'Hospitality',
  RETAIL: 'Retail',
  CONSTRUCTION: 'Construction',
  OFFICE_ADMIN: 'Office & admin',
  HEALTH: 'Health',
  EDUCATION: 'Education',
  DRIVING_LOGISTICS: 'Driving & logistics',
  PROFESSIONAL: 'Professional & technical',

  // Job types
  CASUAL: 'Casual',
  PART_TIME: 'Part-time',
  FULL_TIME: 'Full-time',
  FIXED_TERM: 'Fixed-term',
  CONTRACT: 'Contract',

  // Job tiers (COMMUNITY reuses the label above; Job statuses reuse
  // DRAFT/APPROVED/PUBLISHED/ARCHIVED above)
  STANDARD: 'Standard',
  FEATURED: 'Featured',

  // Directory categories — labels only; the raw values are thetidelanding's
  // URL slugs and must not change to match a label edit.
  cafes: 'Cafés & coffee',
  plumbers: 'Plumbers',
  electricians: 'Electricians',
  mechanics: 'Mechanics & auto repair',
  hairdressers: 'Hairdressers & barbers',
  restaurants: 'Restaurants & takeaways',
  builders: 'Builders & renovations',
  painters: 'Painters & decorators',
  landscaping: 'Landscaping & lawn care',
  'real-estate': 'Real estate agents',
  dentists: 'Dentists',
  beauty: 'Beauty & day spas',
  physio: 'Physio, chiro & massage',
  vets: 'Vets & pet care',
  gyms: 'Gyms & fitness',
  childcare: 'Childcare & early learning',
  cleaners: 'Cleaners',
  movers: 'Movers & storage',
  accountants: 'Accountants & bookkeepers',
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
