import { SECTION_SLOTS, label, type AdType } from '@/lib/enums'
import { SECTION_CAP, SINGLE_SLOT_CAP } from '@/lib/inventory'
import type { AppSettings } from '@/lib/settings'

/**
 * The media kit: what an advertiser is shown at /media-kit, built from the
 * same settings the app sells against. Prices come from the Settings defaults
 * and slot counts from the inventory rules, so the rate card can never quote a
 * price the booking form doesn't pre-fill, or promise a slot the app won't
 * sell.
 *
 * Everything here is pure. The page reads settings once and calls into this.
 */

/** Reading order for the rate card: premium first, then bulletin, then the
 * add-ons. Not the enum order — that one is storage order. */
export const MEDIA_KIT_AD_TYPES = [
  'HEADLINE',
  'FEATURE',
  'BULLETIN_TAKEOVER',
  'BULLETIN_BANNER',
  'BULLETIN_CLASSIFIED',
  'SECTION_SPONSOR',
  'FEATURED_EVENT',
] as const satisfies readonly AdType[]

/** What the advertiser actually gets, in their words rather than the app's. */
const BLURBS: Record<AdType, string> = {
  HEADLINE:
    'The first thing Coasties see. Your image, a short pitch and a link, above the week’s lead story.',
  FEATURE:
    'A block in the body of the email, after the lead story — room for an image, a few lines and a link.',
  BULLETIN_TAKEOVER:
    'The whole bulletin to yourself for a week. No other advertiser sits in the block.',
  BULLETIN_BANNER: 'A banner image and a link in the bulletin, part-way down the email.',
  BULLETIN_CLASSIFIED:
    'A few lines of text and a link in the bulletin. The straightforward, low-cost way in.',
  SECTION_SPONSOR:
    'Your name on a section for the week — “brought to you by” under the heading, with your logo.',
  FEATURED_EVENT:
    'Your event at the top of What’s On, with the date, the place and a More info button.',
}

/**
 * The caps the code carries are 1, and this is prose rather than a column, so
 * they read as words. Anything the operator can change — bulletin capacity —
 * stays a numeral, because that's what they set it to.
 */
function inWords(count: number): string {
  return count === 1 ? 'One' : String(count)
}

/** How much of it exists in an issue, said plainly. */
export function describeAvailability(adType: AdType, bulletinCapacity: number): string {
  switch (adType) {
    case 'BULLETIN_TAKEOVER':
      return `One per issue — it takes all ${bulletinCapacity} bulletin slots`
    case 'BULLETIN_BANNER':
    case 'BULLETIN_CLASSIFIED':
      return `${bulletinCapacity} bulletin slots per issue, shared between banners and classifieds`
    case 'SECTION_SPONSOR':
      return `${inWords(SECTION_CAP)} per section, across ${SECTION_SLOTS.length} sections`
    default:
      return `${inWords(SINGLE_SLOT_CAP)} per issue`
  }
}

export type RateCardRow = {
  adType: AdType
  name: string
  blurb: string
  availability: string
  price: number
}

export function buildRateCard(settings: AppSettings): RateCardRow[] {
  return MEDIA_KIT_AD_TYPES.map((adType) => ({
    adType,
    name: label(adType),
    blurb: BLURBS[adType],
    availability: describeAvailability(adType, settings.bulletinCapacity),
    price: settings.defaultPrices[adType] ?? 0,
  }))
}

export type AudienceStat = { label: string; value: string; note: string }

/**
 * The audience figures, skipping any the operator hasn't filled in — a media
 * kit with "0 subscribers" on it is worse than one without the line.
 */
export function buildAudienceStats(settings: AppSettings): AudienceStat[] {
  const stats: AudienceStat[] = []
  const { mediaKitSubscribers: subscribers, mediaKitOpenRate: openRate } = settings

  if (subscribers > 0) {
    stats.push({
      label: 'Subscribers',
      value: subscribers.toLocaleString('en-NZ'),
      note: 'Coasties who asked for it',
    })
  }
  if (openRate > 0) {
    stats.push({
      label: 'Open rate',
      value: `${openRate}%`,
      note: 'Averaged across recent issues',
    })
  }

  stats.push({
    label: 'Every week',
    value: '1 issue',
    note: 'One email, one morning',
  })

  return stats
}

/**
 * The media kit is public, so it opens only once the operator has switched it
 * on *and* there is a way to reply — a rate card with no contact is a dead end.
 */
export function isMediaKitOpen(settings: AppSettings): boolean {
  return settings.mediaKitPublished && Boolean(settings.mediaKitContactEmail)
}

/** The mailto behind the one action on the page. */
export function bookingMailto(email: string): string {
  const subject = encodeURIComponent('Advertising in The Tide')
  const body = encodeURIComponent(
    [
      'Hi there,',
      '',
      'I’d like to advertise in The Tide. Here’s what I’m after:',
      '',
      '- Business:',
      '- Placement:',
      '- Which issues:',
      '',
      'Thanks,',
    ].join('\n')
  )
  return `mailto:${email}?subject=${subject}&body=${body}`
}
