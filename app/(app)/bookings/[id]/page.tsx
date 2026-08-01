import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { formatDate, formatMoney } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { StatusPill } from '@/components/status-pill'
import { BookingForm } from '../booking-form'
import { DeleteBookingButton } from './delete-booking-button'

export const dynamic = 'force-dynamic'

export default async function EditBookingPage({ params }: { params: { id: string } }) {
  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { advertiser: true, issue: true },
  })

  if (!booking) notFound()

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

  return (
    <>
      <PageHeader
        backHref="/bookings"
        backLabel="All bookings"
        title={booking.label}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link
              href={`/advertisers/${booking.advertiserId}`}
              className="hover:underline"
            >
              {booking.advertiser.name}
            </Link>
            <Link href={`/issues/${booking.issueId}`} className="tabular hover:underline">
              {formatDate(booking.issue.publishDate)}
            </Link>
            <span className="tabular">{formatMoney(booking.price)}</span>
            <StatusPill value={booking.status} />
            <StatusPill value={booking.paid} />
          </span>
        }
        actions={<DeleteBookingButton id={booking.id} label={booking.label} />}
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
          id: booking.id,
          label: booking.label,
          advertiserId: booking.advertiserId,
          issueId: booking.issueId,
          adType: booking.adType,
          section: booking.section ?? 'WEATHER',
          price: String(booking.price),
          status: booking.status,
          paid: booking.paid,
          ctaUrl: booking.ctaUrl ?? '',
          copy: booking.copy ?? '',
          creativeUrl: booking.creativeUrl ?? '',
          notes: booking.notes ?? '',
        }}
      />
    </>
  )
}
