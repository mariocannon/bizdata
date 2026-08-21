import * as React from 'react'
import { CalendarCheck, Handshake, ImageIcon, MailOpen, MapPin, PenLine } from 'lucide-react'
import { prisma } from '@/lib/db'
import { AD_TYPES, LABELS, SECTION_SLOTS, type AdType } from '@/lib/enums'
import { SECTION_CAP, SINGLE_SLOT_CAP } from '@/lib/inventory'
import {
  DEFAULT_BULLETIN_CAPACITY,
  DEFAULT_PRICES,
  DEFAULT_SOLD_OUT_TARGET,
  getSettings,
  type AppSettings,
} from '@/lib/settings'
import { loadSurveyResponses } from '@/lib/survey'
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from '@/lib/upload'
import {
  approxPercent,
  bandCount,
  buildAudience,
  type MediaKitAudience,
} from '@/lib/media-kit'
import { formatMoney } from '@/lib/utils'
import { BrandShell } from '@/components/brand/brand-shell'
import { Panel, SectionHead } from '@/components/media-kit/panel'
import {
  BandRow,
  BreakdownCard,
  Chip,
  ClaimTile,
  PlacementCard,
  ReasonCard,
  StatFigure,
} from '@/components/media-kit/figures'
import { buttonVariants } from '@/components/ui/button'

export const metadata = {
  title: 'Advertise in The Tide — media kit',
  description:
    "Who reads The Tide, what they want covered, and what it costs to reach them. The Hibiscus Coast's weekly email newsletter.",
}

/**
 * The media kit — the page you send a business that asks "who reads this?".
 *
 * It is read the way a deck is read, one idea to a panel, because that is the
 * shape an advertiser expects a media kit in. Everything on it is real: there
 * are no invented testimonials and no borrowed logos, and the sections that
 * have no data yet don't render at all rather than render a placeholder.
 *
 * Public, like the two submission forms: it is in `PUBLIC_PATHS` in
 * `middleware.ts` and there is no way in from it to anything that isn't. It
 * reads three things, all server-side, and publishes none of them as it found
 * them:
 *
 * - **The reader survey**, through `lib/media-kit.ts`, which grades every
 *   figure down to a band, a rounded share or a plain-words fraction before it
 *   reaches this file. No response counts, no exact percentages, nothing off a
 *   question fewer than 30 people answered, and nothing at all from the
 *   free-text or contact columns.
 * - **The rate card and the capacity rules** — the operator's own Settings and
 *   the inventory constants, so the page can't quote a price or promise a slot
 *   the ad manager itself disagrees with.
 * - **Advertisers whose ad has already run.** Only `RAN`, and only the name:
 *   that ad went out to the whole list with their name on it, so the fact of it
 *   is already public. Nothing is said about what they paid, or how often.
 *
 * Anything an advertiser can see here, an advertiser is meant to see.
 */
export const dynamic = 'force-dynamic'

/**
 * Where an interested business is pointed. Unset in development, and unset is
 * not an error: the page falls back to "reply to any issue", which is true of
 * every newsletter and is better than a mailto to nowhere.
 */
const CONTACT_EMAIL = process.env.ADS_CONTACT_EMAIL?.trim()

/**
 * Reach, if the operator has typed it in. It isn't in this app's database —
 * subscribers and opens live in beehiiv — so the media kit takes them as
 * environment variables and bands them on the way out, which also stops a
 * figure typed in once from being quoted to the decimal a year later.
 */
const SUBSCRIBERS = Number(process.env.MEDIA_KIT_SUBSCRIBERS)
const OPEN_RATE = Number(process.env.MEDIA_KIT_OPEN_RATE)

/**
 * The survey is a slow-moving dataset and this page is the public one, so the
 * rollup is held per server instance rather than re-read on every hit. A failed
 * read is held far more briefly — a survey project that was down for a minute
 * shouldn't cost the page its numbers for a quarter of an hour.
 */
const FRESH_MS = 15 * 60 * 1000
const RETRY_MS = 60 * 1000

let memo: { until: number; audience: MediaKitAudience | null } | null = null

async function readAudience(): Promise<MediaKitAudience | null> {
  if (memo && Date.now() < memo.until) return memo.audience

  const load = await loadSurveyResponses()
  const audience = load.status === 'ok' ? buildAudience(load.rows) : null
  memo = {
    until: Date.now() + (load.status === 'ok' ? FRESH_MS : RETRY_MS),
    audience,
  }
  return audience
}

/** The rate card falls back to the defaults rather than 500ing at a stranger. */
async function readSettings(): Promise<AppSettings> {
  try {
    return await getSettings()
  } catch {
    return {
      bulletinCapacity: DEFAULT_BULLETIN_CAPACITY,
      soldOutTarget: DEFAULT_SOLD_OUT_TARGET,
      defaultPrices: DEFAULT_PRICES,
    }
  }
}

/**
 * Businesses whose ad has actually run, alphabetically — not by spend and not
 * by how recently, because neither is anybody's business but ours. A booking
 * that is only reserved or confirmed doesn't count: until it has run, the
 * advertiser hasn't yet chosen to be seen in The Tide.
 */
async function readAdvertisers(): Promise<string[]> {
  try {
    const rows = await prisma.advertiser.findMany({
      where: { bookings: { some: { status: 'RAN' } } },
      select: { name: true },
      orderBy: { name: 'asc' },
      take: 24,
    })
    return rows.map((row) => row.name)
  } catch {
    return []
  }
}

/** What each placement is, in the words you'd use to sell it. */
const FORMATS: Record<AdType, string> = {
  HEADLINE:
    'The first thing Coasties see. Top of the issue, above the news, and nothing else beside it.',
  FEATURE:
    'A block of your own in the body of the issue — a picture, a few lines, and a link straight to you.',
  BULLETIN_BANNER:
    'A banner in the bulletin, the run of short notices Coasties scroll on their way down the issue.',
  BULLETIN_CLASSIFIED:
    'A few lines in the bulletin. The gentlest way in, and where most first-timers start.',
  BULLETIN_TAKEOVER: 'The whole bulletin, yours — every slot in the block, nobody else in it.',
  SECTION_SPONSOR:
    "Your name on a section people open the email for: Weather, What's On, Gigs, Sports, Pet of the Week or the Digest.",
  FEATURED_EVENT:
    "Running something? Your event goes to the top of What's On with a picture on it.",
}

/**
 * How many of each exist in an issue. Read off the same constants the booking
 * form enforces, so the page can't promise a slot the ad manager would refuse.
 */
function availability(adType: AdType, bulletinCapacity: number): string {
  switch (adType) {
    case 'HEADLINE':
    case 'FEATURE':
    case 'FEATURED_EVENT':
      return `${SINGLE_SLOT_CAP} per issue`
    case 'BULLETIN_CLASSIFIED':
    case 'BULLETIN_BANNER':
      return `${bulletinCapacity} bulletin slots, shared`
    case 'BULLETIN_TAKEOVER':
      return `All ${bulletinCapacity} bulletin slots`
    case 'SECTION_SPONSOR':
      return `${SECTION_CAP} per section, ${SECTION_SLOTS.length} sections`
  }
}

/** "PNG, JPEG, GIF, WEBP or SVG" — from what the uploader actually accepts. */
function creativeFormats(): string {
  const names = ALLOWED_UPLOAD_TYPES.map((type) =>
    type.split('/')[1].replace('+xml', '').toUpperCase()
  )
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`
}

export default async function MediaKitPage() {
  const [audience, settings, advertisers] = await Promise.all([
    readAudience(),
    readSettings(),
    readAdvertisers(),
  ])

  // The band across the top. Reach leads when the operator has supplied it;
  // without it the page still opens on something true rather than on a gap.
  const figures: { value: string; label: string; kind?: 'number' | 'word' }[] = []
  if (Number.isFinite(SUBSCRIBERS) && SUBSCRIBERS > 0) {
    figures.push({
      value: bandCount(SUBSCRIBERS),
      label: 'Coasties on the list, and growing',
    })
  }
  if (Number.isFinite(OPEN_RATE) && OPEN_RATE > 0) {
    figures.push({
      value: approxPercent(OPEN_RATE > 1 ? OPEN_RATE / 100 : OPEN_RATE),
      label: 'of them open it',
    })
  }
  figures.push({ value: 'Weekly', label: 'One issue, every week, all year', kind: 'word' })
  figures.push({
    value: 'Free',
    label: 'Readers sign themselves up, and can leave any time',
    kind: 'word',
  })

  return (
    <BrandShell
      width="page"
      title="Advertise in The Tide"
      intro={
        <>
          The Tide is the Hibiscus Coast’s weekly email — what’s on, what’s opened, what’s
          sold, who won on Saturday. If your customers are Coasties, this is the inbox
          they’re already in on a Thursday morning.
        </>
      }
      footer={
        audience ? (
          <>
            The reader numbers on this page come from The Tide’s own reader survey. They’re
            rounded and grouped on purpose — a guide to who’s reading, not a measurement to
            the decimal point.
          </>
        ) : (
          <>The Tide is written and sold on the Hibiscus Coast, one issue a week.</>
        )
      }
    >
      <div className="flex flex-col gap-5">
        <Panel tone="dark">
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {figures.map((figure) => (
              <li key={figure.label}>
                <StatFigure {...figure} />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <SectionHead
            eyebrow="Why The Tide"
            title="A local list, not a mailing list"
            intro={
              <>
                Nobody was bought, bundled or added. Every reader put their own address in
                because they wanted to know what was happening on the Coast this week —
                which is why they open it, and why your ad gets read alongside the news
                instead of skipped past it.
              </>
            }
          />
          <ul className="grid gap-4 sm:grid-cols-3">
            <li>
              <ReasonCard icon={MailOpen} title="An inbox, not a feed">
                No algorithm decides whether your ad gets shown. It goes to everyone who
                asked for the newsletter, in the order we put it.
              </ReasonCard>
            </li>
            <li>
              <ReasonCard icon={MapPin} title="Everyone in it is from here">
                Puhoi to Ōkura. No wasted half of an audience in another city, and no
                clicks from people who are never going to drive to you.
              </ReasonCard>
            </li>
            <li>
              <ReasonCard icon={Handshake} title="We keep the ads few">
                About {settings.soldOutTarget} an issue, {settings.bulletinCapacity} of them
                in the bulletin. We’d rather sell a few ads that work than fill the page.
              </ReasonCard>
            </li>
          </ul>
        </Panel>

        {audience ? (
          <>
            {audience.headlines.length > 0 ? (
              <Panel tone="tint">
                <SectionHead
                  eyebrow="The audience"
                  title="Who reads The Tide"
                  intro={
                    <>
                      From our own reader survey. Shares are of the readers who answered
                      that question, and they’re rounded — we’d rather round than pretend
                      to a decimal point.
                    </>
                  }
                  tone="tint"
                />
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {audience.headlines.map((headline) => (
                    <li key={headline.claim}>
                      <ClaimTile {...headline} />
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}

            {audience.profile.length > 0 ? (
              <Panel>
                <SectionHead
                  eyebrow="The profile"
                  title="Households, not clicks"
                  intro={
                    <>
                      Grouped into bands, because that’s the honest resolution of a reader
                      survey — and because it’s the level you make a decision at. Rounded
                      shares don’t always add to 100.
                    </>
                  }
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  {audience.profile.map((breakdown) => (
                    <BreakdownCard key={breakdown.title} breakdown={breakdown} />
                  ))}
                </div>
              </Panel>
            ) : null}

            {audience.topics ? (
              <Panel tone="tint">
                <SectionHead
                  eyebrow="What they came for"
                  title="The stories readers ask us for"
                  intro={
                    <>
                      Readers could pick more than one, so these add to more than a whole.
                      It’s worth knowing which section your ad will be sitting next to.
                    </>
                  }
                  tone="tint"
                />
                <ul className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 shadow-sm">
                  {audience.topics.map((topic) => (
                    <BandRow key={topic.label} band={topic} />
                  ))}
                </ul>
              </Panel>
            ) : null}

            {audience.interests.length > 0 || audience.suburbs.length > 0 ? (
              <Panel>
                <SectionHead
                  eyebrow="Life on the Coast"
                  title="What they do at the weekend, and where"
                  intro="Handy if you sell to one of these in particular."
                />
                {audience.interests.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {audience.interests.map((interest) => (
                      <Chip key={interest.claim}>
                        <span className="font-semibold text-steel">{interest.words}</span>{' '}
                        {interest.claim}
                      </Chip>
                    ))}
                  </ul>
                ) : null}

                {audience.suburbs.length > 0 ? (
                  <>
                    <p className="mt-8 text-sm text-muted-foreground">
                      And the suburbs they’ve told us they live in, from the top of the
                      coast down:
                    </p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {audience.suburbs.map((suburb) => (
                        <Chip key={suburb}>{suburb}</Chip>
                      ))}
                    </ul>
                  </>
                ) : null}
              </Panel>
            ) : null}
          </>
        ) : (
          <Panel>
            <SectionHead
              eyebrow="The audience"
              title="Who reads The Tide"
              intro={
                <>
                  Our reader survey is still collecting, and we’d rather show you nothing
                  than show you a number we can’t stand behind yet. Ask us where it stands
                  — we’ll tell you straight.
                </>
              }
            />
            <p className="rounded-lg border border-border bg-card p-5 leading-6 text-muted-foreground shadow-sm">
              What we can tell you today: The Tide goes out every week to Coasties who
              signed themselves up, from Puhoi down to Ōkura, and we cap how many ads ride
              along with it.
            </p>
          </Panel>
        )}

        {advertisers.length >= 3 ? (
          <Panel tone="tint">
            <SectionHead
              eyebrow="In good company"
              title="Coast businesses already running with us"
              intro="A few of the people whose ads have gone out in The Tide."
              tone="tint"
            />
            <ul className="flex flex-wrap gap-2">
              {advertisers.map((name) => (
                <Chip key={name}>{name}</Chip>
              ))}
            </ul>
          </Panel>
        ) : null}

        <Panel>
          <SectionHead
            eyebrow="Ways in"
            title="What you can book"
            intro={
              <>
                Prices are per issue, and there are only so many of each. We aim at three
                parts newsletter to one part advertising, which is the whole reason the
                slots are capped.
              </>
            }
          />
          <ul className="grid gap-4 sm:grid-cols-2">
            {AD_TYPES.map((adType) => (
              <li key={adType}>
                <PlacementCard
                  name={LABELS[adType]}
                  price={formatMoney(settings.defaultPrices[adType])}
                  availability={availability(adType, settings.bulletinCapacity)}
                >
                  {FORMATS[adType]}
                </PlacementCard>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel tone="tint">
          <SectionHead eyebrow="The easy part" title="What we need from you" tone="tint" />
          <ul className="grid gap-4 sm:grid-cols-3">
            <li>
              <ReasonCard icon={PenLine} title="Words">
                A line or two, and a link. Ads that read like a note from a neighbour do
                better here than ads that read like ads — and we’ll help you write it if
                you’d rather not.
              </ReasonCard>
            </li>
            <li>
              <ReasonCard icon={ImageIcon} title="A picture">
                {creativeFormats()}, up to {Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB.
                Your logo is fine. A photo of the actual place is better.
              </ReasonCard>
            </li>
            <li>
              <ReasonCard icon={CalendarCheck} title="A couple of days">
                We build each issue two days before it goes out, so words and picture need
                to be with us by then. Miss it and we’ll move you to the next week.
              </ReasonCard>
            </li>
          </ul>
        </Panel>

        <Panel tone="dark">
          <SectionHead
            eyebrow="Next step"
            title="Tell us what you’re selling"
            intro={
              <>
                Say what you do and roughly when you’d like to run, and we’ll come back
                with the weeks that are open and what we’d suggest. No contracts and no
                minimum run — plenty of Coast businesses start with one issue to see how it
                goes.
              </>
            }
            tone="dark"
          />
          {CONTACT_EMAIL ? (
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
                'Advertising in The Tide'
              )}`}
              className={buttonVariants({ size: 'lg' })}
            >
              Email us about advertising
            </a>
          ) : (
            <p className="text-tide-100">
              Reply to any issue of The Tide — it comes straight to us, and we’ll get back
              to you this week.
            </p>
          )}
        </Panel>
      </div>
    </BrandShell>
  )
}
