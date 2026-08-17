import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Mail } from 'lucide-react'
import { BrandShell } from '@/components/brand/brand-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getSettings } from '@/lib/settings'
import {
  bookingMailto,
  buildAudienceStats,
  buildRateCard,
  isMediaKitOpen,
} from '@/lib/media-kit'
import { formatMoney } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Advertise in The Tide',
  description:
    'Rates and placements for advertising in The Tide, the Hibiscus Coast’s weekly email newsletter.',
}

/**
 * The media kit — the page an advertiser is sent, and the second thing on the
 * site anyone can open without the password (see PUBLIC_PATHS in
 * middleware.ts).
 *
 * It reads one row: Settings. That row holds the rate card the app already
 * sells against, so what an advertiser is quoted here and what the booking
 * form pre-fills cannot drift apart. Nothing about advertisers, bookings or
 * revenue is read, and nothing on this page is writable — the only action is a
 * mailto.
 *
 * It stays 404 until the operator ticks "Publish the media kit" in Settings,
 * so a fresh deploy never puts a rate card on the internet by accident.
 */
export default async function MediaKitPage() {
  const settings = await getSettings()
  if (!isMediaKitOpen(settings)) notFound()

  const stats = buildAudienceStats(settings)
  const rateCard = buildRateCard(settings)
  const email = settings.mediaKitContactEmail as string

  return (
    <BrandShell
      width="wide"
      title="Advertise in The Tide"
      intro={
        <>
          The Tide is the Hibiscus Coast&rsquo;s weekly email — what&rsquo;s on,
          who&rsquo;s doing what, and the small news that doesn&rsquo;t make the
          papers. Coasties asked for it, so they open it. Here&rsquo;s what it
          costs to be in it.
        </>
      }
      footer={
        <>
          Prices are in New Zealand dollars and hold for the current season.
          Running an event or selling something one-off?{' '}
          <Link href="/submit" className="font-medium text-steel hover:underline">
            A classified is free to send in.
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <section aria-label="The audience">
          <div className="grid gap-3 sm:grid-cols-3">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="flex flex-col gap-0.5 p-4 text-center">
                  <p className="tabular text-2xl font-extrabold tracking-tight text-harbor">
                    {stat.value}
                  </p>
                  <p className="text-sm font-medium text-harbor">{stat.label}</p>
                  <p className="text-xs text-driftwood">{stat.note}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="rate-card">
          <h2
            id="rate-card"
            className="mb-3 text-lg font-extrabold tracking-tight text-harbor"
          >
            Where you can sit
          </h2>

          <Card>
            <CardContent className="divide-y divide-navy/15 p-0">
              {rateCard.map((row) => (
                <div
                  key={row.adType}
                  className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-harbor">{row.name}</h3>
                    <p className="text-sm text-muted-foreground">{row.blurb}</p>
                    <p className="mt-1 text-xs text-driftwood">{row.availability}</p>
                  </div>
                  <p className="tabular shrink-0 text-lg font-bold text-harbor sm:text-right">
                    {formatMoney(row.price)}
                    <span className="ml-1 text-xs font-normal text-driftwood">
                      per issue
                    </span>
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="how-it-works">
          <h2
            id="how-it-works"
            className="mb-3 text-lg font-extrabold tracking-tight text-harbor"
          >
            How it works
          </h2>

          <Card>
            <CardContent className="flex flex-col gap-3 p-4 text-sm text-muted-foreground">
              <p>
                <span className="font-semibold text-harbor">Pick a spot and a week.</span>{' '}
                Tell us the placement and which issues you&rsquo;d like. Each slot is
                held for one advertiser, so the earlier you ask the more choice
                there is.
              </p>
              <p>
                <span className="font-semibold text-harbor">Send your words and artwork.</span>{' '}
                A line or two of copy, a link, and an image if the placement takes
                one. We&rsquo;ll lay it out to match the newsletter.
              </p>
              <p>
                <span className="font-semibold text-harbor">We invoice once it runs.</span>{' '}
                You&rsquo;ll get a copy of the issue your ad went out in.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="text-center">
          <Button asChild size="lg">
            <a href={bookingMailto(email)}>
              <Mail />
              Book a spot
            </a>
          </Button>
          <p className="mt-2 text-xs text-driftwood">
            Or email us at{' '}
            <a href={`mailto:${email}`} className="font-medium text-steel hover:underline">
              {email}
            </a>
            .
          </p>
        </section>
      </div>
    </BrandShell>
  )
}
