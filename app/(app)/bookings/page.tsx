import Link from 'next/link'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import { prisma } from '@/lib/db'
import { centsToDollars } from '@/lib/money'
import { AD_TYPES, PAID_STATUSES, BOOKING_STATUSES, label } from '@/lib/enums'
import { formatDate, formatMoney } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { FilterBar } from '@/components/filter-bar'
import { ViewToggle } from '@/components/view-toggle'
import { SortHeader } from '@/components/sort-header'
import { StatusPill } from '@/components/status-pill'
import { AdTypeChip, adTypeChipClass } from '@/components/ad-type-chip'
import { ExportCsvButton } from '@/components/export-csv-button'
import { MonthCalendar } from '@/components/month-calendar'
import { monthFromParam } from '@/lib/calendar'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PaidStatusSelect } from './paid-status-select'

export const dynamic = 'force-dynamic'

const CSV_COLUMNS = [
  { header: 'Label', key: 'label' },
  { header: 'Advertiser', key: 'advertiser' },
  { header: 'Ad type', key: 'adType' },
  { header: 'Section', key: 'section' },
  { header: 'Issue', key: 'issue' },
  { header: 'Publish date', key: 'publishDate' },
  { header: 'Price', key: 'price' },
  { header: 'Status', key: 'status' },
  { header: 'Paid', key: 'paid' },
  { header: 'CTA URL', key: 'ctaUrl' },
  { header: 'Copy', key: 'copy' },
  { header: 'Notes', key: 'notes' },
]

type SearchParams = {
  view?: string
  q?: string
  issue?: string
  adType?: string
  paid?: string
  status?: string
  advertiser?: string
  sort?: string
  dir?: string
  month?: string
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const view =
    searchParams.view === 'calendar'
      ? 'calendar'
      : searchParams.view === 'unpaid'
        ? 'unpaid'
        : 'table'

  const query = searchParams.q?.trim().toLowerCase() ?? ''
  const sort = searchParams.sort ?? 'publishDate'
  const dir = searchParams.dir === 'desc' ? 'desc' : 'asc'

  const [bookings, issues] = await Promise.all([
    prisma.booking.findMany({
      include: { advertiser: true, issue: true },
      orderBy: { issue: { publishDate: 'asc' } },
    }),
    prisma.issue.findMany({ orderBy: { publishDate: 'asc' } }),
  ])

  let rows = bookings.filter((booking) => {
    if (
      query &&
      !booking.label.toLowerCase().includes(query) &&
      !booking.advertiser.name.toLowerCase().includes(query)
    ) {
      return false
    }
    if (searchParams.issue && booking.issueId !== searchParams.issue) return false
    if (searchParams.adType && booking.adType !== searchParams.adType) return false
    if (searchParams.paid && booking.paid !== searchParams.paid) return false
    if (searchParams.status && booking.status !== searchParams.status) return false
    if (searchParams.advertiser && booking.advertiserId !== searchParams.advertiser) {
      return false
    }
    return true
  })

  // The chase list: everything owing that hasn't been cancelled.
  if (view === 'unpaid') {
    rows = rows.filter(
      (booking) => booking.paid !== 'PAID' && booking.status !== 'CANCELLED'
    )
  }

  rows.sort((a, b) => {
    const factor = dir === 'desc' ? -1 : 1
    // The chase list is always oldest-issue-first regardless of column sort.
    if (view === 'unpaid' && !searchParams.sort) {
      return a.issue.publishDate.getTime() - b.issue.publishDate.getTime()
    }
    switch (sort) {
      case 'label':
        return a.label.localeCompare(b.label) * factor
      case 'advertiser':
        return a.advertiser.name.localeCompare(b.advertiser.name) * factor
      case 'adType':
        return (
          (AD_TYPES.indexOf(a.adType as never) - AD_TYPES.indexOf(b.adType as never)) *
          factor
        )
      case 'price':
        return (a.price - b.price) * factor
      case 'status':
        return (
          (BOOKING_STATUSES.indexOf(a.status as never) -
            BOOKING_STATUSES.indexOf(b.status as never)) *
          factor
        )
      case 'paid':
        return (
          (PAID_STATUSES.indexOf(a.paid as never) - PAID_STATUSES.indexOf(b.paid as never)) *
          factor
        )
      default:
        return (a.issue.publishDate.getTime() - b.issue.publishDate.getTime()) * factor
    }
  })

  const csvRows = rows.map((booking) => ({
    label: booking.label,
    advertiser: booking.advertiser.name,
    adType: label(booking.adType),
    section: booking.section ? label(booking.section) : '',
    issue: booking.issue.title,
    publishDate: booking.issue.publishDate.toISOString().slice(0, 10),
    price: centsToDollars(booking.price),
    status: label(booking.status),
    paid: label(booking.paid),
    ctaUrl: booking.ctaUrl ?? '',
    copy: booking.copy ?? '',
    notes: booking.notes ?? '',
  }))

  const totalValue = rows
    .filter((booking) => booking.status !== 'CANCELLED')
    .reduce((sum, booking) => sum + booking.price, 0)

  const month = format(monthFromParam(searchParams.month), 'yyyy-MM')

  return (
    <>
      <PageHeader
        title="Bookings"
        description={
          <span className="tabular">
            {rows.length} of {bookings.length} ·{' '}
            {view === 'unpaid' ? `${formatMoney(totalValue)} outstanding` : `${formatMoney(totalValue)} booked`}
          </span>
        }
        actions={
          <>
            <ExportCsvButton
              rows={csvRows}
              columns={CSV_COLUMNS}
              filename="the-tide-bookings"
            />
            <Button asChild>
              <Link href="/bookings/new">
                <Plus />
                New booking
              </Link>
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <FilterBar
            search={{ param: 'q', placeholder: 'Search bookings…' }}
            filters={[
              {
                param: 'issue',
                label: 'Issue',
                options: issues.map((issue) => ({ value: issue.id, label: issue.title })),
              },
              {
                param: 'adType',
                label: 'Ad type',
                options: AD_TYPES.map((value) => ({ value, label: label(value) })),
              },
              {
                param: 'paid',
                label: 'Paid',
                options: PAID_STATUSES.map((value) => ({ value, label: label(value) })),
              },
            ]}
          />
          <ViewToggle
            current={view}
            options={[
              { value: 'table', label: 'Table' },
              { value: 'calendar', label: 'Calendar' },
              { value: 'unpaid', label: 'Unpaid' },
            ]}
          />
        </div>
      </PageHeader>

      {view === 'unpaid' ? (
        <p className="mb-3 text-sm text-muted-foreground">
          Everything still owing, oldest issue first — the chase list. Cancelled bookings are
          excluded.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title={view === 'unpaid' ? 'Nothing outstanding' : 'No bookings match'}
          description={
            view === 'unpaid'
              ? 'Every non-cancelled booking is paid. Nice.'
              : bookings.length === 0
                ? 'Sell your first slot into an upcoming issue.'
                : 'Try clearing the filters or the search term.'
          }
          action={
            bookings.length === 0 ? (
              <Button asChild>
                <Link href="/bookings/new">
                  <Plus />
                  New booking
                </Link>
              </Button>
            ) : null
          }
        />
      ) : view === 'calendar' ? (
        <MonthCalendar
          month={month}
          emptyLabel="No bookings run in this month."
          events={rows.map((booking) => ({
            id: booking.id,
            date: format(booking.issue.publishDate, 'yyyy-MM-dd'),
            title: booking.advertiser.name,
            subtitle: label(booking.adType),
            href: `/bookings/${booking.id}`,
            className:
              booking.status === 'CANCELLED'
                ? 'bg-slate-100 text-slate-500 line-through'
                : adTypeChipClass(booking.adType),
          }))}
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>
                  <SortHeader column="label">Booking</SortHeader>
                </TableHead>
                <TableHead>
                  <SortHeader column="advertiser">Advertiser</SortHeader>
                </TableHead>
                <TableHead>
                  <SortHeader column="adType">Ad type</SortHeader>
                </TableHead>
                <TableHead>
                  <SortHeader column="publishDate">Issue</SortHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortHeader column="price" align="right">
                    Price
                  </SortHeader>
                </TableHead>
                <TableHead>
                  <SortHeader column="status">Status</SortHeader>
                </TableHead>
                <TableHead>
                  <SortHeader column="paid">Paid</SortHeader>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="max-w-xs">
                    <Link
                      href={`/bookings/${booking.id}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {booking.label}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/advertisers/${booking.advertiserId}`}
                      className="hover:underline"
                    >
                      {booking.advertiser.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <AdTypeChip adType={booking.adType} section={booking.section} />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/issues/${booking.issueId}`}
                      className="tabular text-muted-foreground hover:underline"
                    >
                      {formatDate(booking.issue.publishDate)}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular text-right font-medium">
                    {formatMoney(booking.price)}
                  </TableCell>
                  <TableCell>
                    <StatusPill value={booking.status} />
                  </TableCell>
                  <TableCell>
                    {view === 'unpaid' ? (
                      <PaidStatusSelect id={booking.id} paid={booking.paid} />
                    ) : (
                      <StatusPill value={booking.paid} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  )
}
