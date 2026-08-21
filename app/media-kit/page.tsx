import * as React from 'react'
import { AD_TYPES, LABELS, type AdType } from '@/lib/enums'
import {
  DEFAULT_BULLETIN_CAPACITY,
  DEFAULT_PRICES,
  DEFAULT_SOLD_OUT_TARGET,
  getSettings,
  type AppSettings,
} from '@/lib/settings'
import { loadSurveyResponses } from '@/lib/survey'
import {
  approxPercent,
  bandCount,
  buildAudience,
  type Band,
  type Breakdown,
  type Claim,
  type MediaKitAudience,
} from '@/lib/media-kit'
import { formatMoney } from '@/lib/utils'
import { BrandShell } from '@/components/brand/brand-shell'
import { buttonVariants } from '@/components/ui/button'

export const metadata = {
  title: 'Advertise in The Tide — media kit',
  description:
    "Who reads The Tide, what they want covered, and what it costs to reach them. The Hibiscus Coast's weekly email newsletter.",
}

/**
 * The media kit — the page you send a business that asks "who reads this?".
 *
 * Public, like the two submission forms: it is in `PUBLIC_PATHS` in
 * `middleware.ts` and there is no way in from it to anything that isn't. It
 * reads two things, both server-side, and publishes neither as it found them:
 *
 * - **The reader survey**, through `lib/media-kit.ts`, which grades every
 *   figure down to a band, a rounded share or a plain-words fraction before it
 *   reaches this file. No response counts, no exact percentages, nothing off a
 *   question fewer than 30 people answered, and nothing at all from the
 *   free-text or contact columns.
 * - **The rate card** — the operator's own default prices, from Settings.
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

/** What each ad type is, in the words you'd use to sell it. */
const FORMATS: Record<AdType, string> = {
  HEADLINE:
    'The first thing Coasties see. Top of the issue, above the news, one a week and no one beside it.',
  FEATURE:
    'A block of your own in the body of the issue — a picture, a few lines and a link straight to you.',
  BULLETIN_BANNER:
    'A banner in the bulletin, the run of short notices Coasties scroll on their way down the issue.',
  BULLETIN_CLASSIFIED:
    'A few lines in the bulletin. The gentlest way in, and the one most first-timers start with.',
  BULLETIN_TAKEOVER: 'The whole bulletin, yours — every slot in the block, nobody else in it.',
  SECTION_SPONSOR:
    "Your name on a section people open the email for: Weather, What's On, Gigs, Sports, Pet of the Week or the Digest.",
  FEATURED_EVENT:
    "Running something? Your event goes to the top of What's On with a picture on it.",
}

// ── Small pieces ─────────────────────────────────────────────────────────────

function Section({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string
  title: string
  intro?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="mt-12 first:mt-0">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-1.5 text-xl font-extrabold tracking-[-0.015em]">{title}</h2>
      {intro ? (
        <p className="mt-2 max-w-prose text-pretty text-sm text-muted-foreground">{intro}</p>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  )
}

/**
 * One claim, said the way a person would say it: "2 in 3 own their home". The
 * fraction is Steel Blue — display size, so it clears 3:1 — and never Sea
 * Glass, which is a fill and not a letter (docs/BRANDING.md §1).
 */
function ClaimTile({ words, claim }: Claim) {
  return (
    <div className="h-full rounded-lg border border-border bg-card p-4 shadow-sm">
      <p className="tabular text-2xl font-extrabold leading-none tracking-tight text-steel">
        {words}
      </p>
      <p className="mt-2 text-sm leading-snug">{claim}</p>
    </div>
  )
}

/** A band of readers, as a Sea Glass fill against the label and the share. */
function BandRow({ band }: { band: Band }) {
  return (
    <li className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 text-muted-foreground sm:w-36">{band.label}</span>
      <span
        className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary"
        aria-hidden
      >
        <span className="block h-full rounded-full bg-seaglass" style={{ width: `${band.width}%` }} />
      </span>
      <span className="tabular w-14 shrink-0 text-right text-muted-foreground">
        {band.percent}
      </span>
    </li>
  )
}

function BreakdownCard({ breakdown }: { breakdown: Breakdown }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold">{breakdown.title}</h3>
      <ul className="mt-4 flex flex-col gap-2.5">
        {breakdown.bands.map((band) => (
          <BandRow key={band.label} band={band} />
        ))}
      </ul>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-full border border-border bg-card px-3 py-1.5 text-sm">
      {children}
    </li>
  )
}

// ── The page ─────────────────────────────────────────────────────────────────

export default async function MediaKitPage() {
  const [audience, settings] = await Promise.all([readAudience(), readSettings()])

  const glance: Claim[] = [
    { words: 'Weekly', claim: 'One email, every week, from the Coast' },
    { words: 'Free', claim: 'Readers opt in themselves and can leave any time' },
  ]

  if (Number.isFinite(SUBSCRIBERS) && SUBSCRIBERS > 0) {
    glance.unshift({
      words: bandCount(SUBSCRIBERS),
      claim: 'Coasties on the list, and growing',
    })
  }
  if (Number.isFinite(OPEN_RATE) && OPEN_RATE > 0) {
    glance.push({
      words: approxPercent(OPEN_RATE > 1 ? OPEN_RATE / 100 : OPEN_RATE),
      claim: 'of them open it',
    })
  }

  return (
    <BrandShell
      width="page"
      title="Advertise in The Tide"
      intro={
        <>
          The Tide is the Hibiscus Coast&rsquo;s weekly email — what&rsquo;s on, what&rsquo;s
          opened, what&rsquo;s sold, who won on Saturday. If your customers are Coasties,
          this is the inbox they&rsquo;re already in on a Thursday morning.
        </>
      }
      footer={
        audience ? (
          <>
            The reader numbers on this page come from The Tide&rsquo;s own reader survey.
            They&rsquo;re rounded and grouped on purpose — a guide to who&rsquo;s reading,
            not a measurement to the decimal point.
          </>
        ) : (
          <>The Tide is written and sold on the Hibiscus Coast, one issue a week.</>
        )
      }
    >
      <Section
        eyebrow="At a glance"
        title="A local list, not a mailing list"
        intro={
          <>
            Nobody was bought, bundled or added. Every reader put their own address in
            because they wanted to know what was happening on the Coast this week — which
            is why they open it, and why your ad gets read alongside the news rather than
            skipped past it.
          </>
        }
      >
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {glance.map((fact) => (
            <li key={fact.claim}>
              <ClaimTile {...fact} />
            </li>
          ))}
        </ul>
      </Section>

      {audience ? (
        <>
          {audience.headlines.length > 0 ? (
            <Section
              eyebrow="The audience"
              title="Who reads The Tide"
              intro={
                <>
                  From the reader survey. Shares are of the readers who answered that
                  question, rounded to keep them honest.
                </>
              }
            >
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {audience.headlines.map((headline) => (
                  <li key={headline.claim}>
                    <ClaimTile {...headline} />
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {audience.profile.length > 0 ? (
            <Section
              eyebrow="The profile"
              title="Households, not clicks"
              intro={
                <>
                  Grouped into bands, because that&rsquo;s the honest resolution of a
                  reader survey — and because it&rsquo;s the level you make a decision at.
                  Rounded shares don&rsquo;t always add to 100.
                </>
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {audience.profile.map((breakdown) => (
                  <BreakdownCard key={breakdown.title} breakdown={breakdown} />
                ))}
              </div>
            </Section>
          ) : null}

          {audience.topics ? (
            <Section
              eyebrow="What they came for"
              title="The stories readers ask us for"
              intro={
                <>
                  Readers could pick more than one, so these add to more than a whole.
                  It&rsquo;s worth knowing which section your ad will be sitting next to.
                </>
              }
            >
              <ul className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-5 shadow-sm">
                {audience.topics.map((topic) => (
                  <BandRow key={topic.label} band={topic} />
                ))}
              </ul>
            </Section>
          ) : null}

          {audience.interests.length > 0 ? (
            <Section
              eyebrow="What they’re into"
              title="Weekends on the Coast"
              intro="Useful if you sell to a particular one of these."
            >
              <ul className="flex flex-wrap gap-2">
                {audience.interests.map((interest) => (
                  <Chip key={interest.claim}>
                    <span className="font-semibold text-steel">{interest.words}</span>{' '}
                    {interest.claim}
                  </Chip>
                ))}
              </ul>
            </Section>
          ) : null}

          {audience.suburbs.length > 0 ? (
            <Section
              eyebrow="Where they are"
              title="Up and down the Coast"
              intro="Suburbs readers have told us they live in, from the top of the coast down."
            >
              <ul className="flex flex-wrap gap-2">
                {audience.suburbs.map((suburb) => (
                  <Chip key={suburb}>{suburb}</Chip>
                ))}
              </ul>
            </Section>
          ) : null}
        </>
      ) : (
        <Section
          eyebrow="The audience"
          title="Who reads The Tide"
          intro={
            <>
              Our reader survey is still collecting, and we&rsquo;d rather show you nothing
              than show you a number we can&rsquo;t stand behind yet. Ask us where it
              stands — we&rsquo;ll tell you straight.
            </>
          }
        >
          <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground shadow-sm">
            What we can tell you today: The Tide goes out every week to Coasties who signed
            themselves up, from Puhoi down to Ōkura, and we cap how many ads ride along with
            it.
          </p>
        </Section>
      )}

      <Section
        eyebrow="Ways in"
        title="What you can book"
        intro={
          <>
            Prices are per issue. We keep an issue to about {settings.soldOutTarget} ads all
            up, and only {settings.bulletinCapacity} slots in the bulletin, so nothing you
            book is buried in a wall of advertising.
          </>
        }
      >
        <ul className="rounded-lg border border-border bg-card px-5 shadow-sm">
          {AD_TYPES.map((adType) => (
            <li
              key={adType}
              // The price keeps its own column rather than sitting in the flow,
              // so a long description can't push it onto a line of its own.
              className="grid grid-cols-[1fr_auto] gap-x-6 border-b border-border/70 py-4 last:border-0"
            >
              <p className="text-sm font-semibold">{LABELS[adType]}</p>
              <p className="tabular text-right text-sm font-semibold">
                {formatMoney(settings.defaultPrices[adType])}
              </p>
              <p className="col-start-1 mt-0.5 text-sm text-muted-foreground">
                {FORMATS[adType]}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        eyebrow="Next step"
        title="Tell us what you’re selling"
        intro={
          <>
            Say what you do and roughly when you&rsquo;d like to run, and we&rsquo;ll come
            back with the weeks that are open and what we&rsquo;d suggest. No contracts, no
            minimum run — plenty of Coast businesses start with one issue to see how it
            goes.
          </>
        }
      >
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
          <p className="text-sm">
            Reply to any issue of The Tide — it comes straight to us, and we&rsquo;ll get
            back to you this week.
          </p>
        )}
      </Section>
    </BrandShell>
  )
}
