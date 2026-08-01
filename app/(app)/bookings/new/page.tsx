import { prisma } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { centsToInput } from '@/lib/money'
import { PageHeader } from '@/components/page-header'
import { BookingForm } from '../booking-form'

export const dynamic = 'force-dynamic'

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: { advertiserId?: string; issueId?: string }
}) {
  const [advertisers, issues, settings] = await Promise.all([
    prisma.advertiser.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.issue.findMany({
      orderBy: { publishDate: 'asc' },
      select: { id: true, title: true, publishDate: true },
    }),
    getSettings(),
  ])

  const defaultAdType = 'HEADLINE'

  return (
    <>
      <PageHeader
        backHref="/bookings"
        backLabel="All bookings"
        title="New booking"
        description="Sell a slot into an issue. Inventory is checked as you go."
      />

      <BookingForm
        advertisers={advertisers}
        issues={issues.map((issue) => ({
          id: issue.id,
          title: issue.title,
          publishDate: issue.publishDate.toISOString(),
        }))}
        defaultPrices={settings.defaultPrices}
        booking={{
          id: '',
          label: '',
          advertiserId: searchParams.advertiserId ?? advertisers[0]?.id ?? '',
          issueId: searchParams.issueId ?? issues[0]?.id ?? '',
          adType: defaultAdType,
          section: 'WEATHER',
          price: centsToInput(settings.defaultPrices[defaultAdType] ?? 0),
          status: 'RESERVED',
          paid: 'UNPAID',
          ctaUrl: '',
          copy: '',
          creativeUrl: '',
          notes: '',
        }}
      />
    </>
  )
}
