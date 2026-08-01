import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink, ImageOff, Plus } from 'lucide-react'
import { prisma } from '@/lib/db'
import { sumBookings } from '@/lib/rollups'
import { getCapacityReport } from '@/lib/inventory'
import { getSettings } from '@/lib/settings'
import { label } from '@/lib/enums'
import { formatDate, formatMoney, toDateInput } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { StatusPill } from '@/components/status-pill'
import { CapacityPanel } from '@/components/capacity-panel'
import { AdTypeChip } from '@/components/ad-type-chip'
import { ViewToggle } from '@/components/view-toggle'
import { ExportCsvButton } from '@/components/export-csv-button'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { IssueForm } from '../issue-form'
import { DeleteIssueButton } from './delete-issue-button'

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

export default async function IssueDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { tab?: string }
}) {
  const tab = searchParams.tab === 'checklist' ? 'checklist' : 'bookings'

  const issue = await prisma.issue.findUnique({
    where: { id: params.id },
    include: {
      bookings: {
        include: { advertiser: true },
        orderBy: [{ adType: 'asc' }, { createdAt: 'asc' }],
      },
    },
  })

  if (!issue) notFound()

  const [report, settings] = await Promise.all([
    getCapacityReport(issue.id),
    getSettings(),
  ])
  const totals = sumBookings(issue.bookings)

  const csvRows = issue.bookings.map((booking) => ({
    label: booking.label,
    advertiser: booking.advertiser.name,
    adType: label(booking.adType),
    section: booking.section ? label(booking.section) : '',
    issue: issue.title,
    publishDate: issue.publishDate.toISOString().slice(0, 10),
    price: booking.price,
    status: label(booking.status),
    paid: label(booking.paid),
    ctaUrl: booking.ctaUrl ?? '',
    copy: booking.copy ?? '',
    notes: booking.notes ?? '',
  }))

  // The build sheet only needs what actually runs on send day.
  const liveBookings = issue.bookings.filter((booking) => booking.status !== 'CANCELLED')

  return (
    <>
      <PageHeader
        backHref="/issues"
        backLabel="All issues"
        title={
          <span className="flex items-center gap-2">
            {issue.title}
            <StatusPill value={issue.status} />
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="tabular">Publishes {formatDate(issue.publishDate)}</span>
            <span className="tabular">
              {report.totalSold} / {report.totalCap} slots
            </span>
            <span className="tabular">{formatMoney(totals.booked)} booked</span>
            {totals.outstanding > 0 ? (
              <span className="tabular text-amber-700">
                {formatMoney(totals.outstanding)} outstanding
              </span>
            ) : null}
            {issue.theme ? <span className="italic">{issue.theme}</span> : null}
          </span>
        }
        actions={
          <>
            <ExportCsvButton
              rows={csvRows}
              columns={CSV_COLUMNS}
              filename={`the-tide-issue-${toDateInput(issue.publishDate)}`}
            />
            <DeleteIssueButton
              id={issue.id}
              title={issue.title}
              bookingCount={issue.bookings.length}
            />
            <IssueForm
              issue={{
                id: issue.id,
                title: issue.title,
                publishDate: toDateInput(issue.publishDate),
                status: issue.status,
                theme: issue.theme ?? '',
              }}
              trigger={<Button variant="outline">Edit</Button>}
            />
            <Button asChild>
              <Link href={`/bookings/new?issueId=${issue.id}`}>
                <Plus />
                New booking
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <CapacityPanel report={report} soldOutTarget={settings.soldOutTarget} />
        </div>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <ViewToggle
              param="tab"
              current={tab}
              options={[
                { value: 'bookings', label: 'Bookings' },
                { value: 'checklist', label: 'Publish checklist' },
              ]}
            />
            <p className="tabular text-sm text-muted-foreground">
              {liveBookings.length} live · {issue.bookings.length - liveBookings.length}{' '}
              cancelled
            </p>
          </div>

          {issue.bookings.length === 0 ? (
            <EmptyState
              title="Nothing booked into this issue yet"
              description="Sell a slot and it will appear here and in the inventory panel."
              action={
                <Button asChild>
                  <Link href={`/bookings/new?issueId=${issue.id}`}>
                    <Plus />
                    New booking
                  </Link>
                </Button>
              }
            />
          ) : tab === 'checklist' ? (
            <PublishChecklist bookings={liveBookings} />
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Advertiser</TableHead>
                    <TableHead>Ad type</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issue.bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <Link
                          href={`/bookings/${booking.id}`}
                          className="font-medium hover:underline"
                        >
                          {booking.advertiser.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <AdTypeChip adType={booking.adType} section={booking.section} />
                      </TableCell>
                      <TableCell className="tabular text-right font-medium">
                        {formatMoney(booking.price)}
                      </TableCell>
                      <TableCell>
                        <StatusPill value={booking.status} />
                      </TableCell>
                      <TableCell>
                        <StatusPill value={booking.paid} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}

type ChecklistBooking = {
  id: string
  adType: string
  section: string | null
  copy: string | null
  creativeUrl: string | null
  ctaUrl: string | null
  advertiser: { name: string }
}

/** The build sheet for send day: what runs, what it says, what it links to. */
function PublishChecklist({ bookings }: { bookings: ChecklistBooking[] }) {
  if (bookings.length === 0) {
    return (
      <EmptyState
        title="Nothing to build"
        description="Every booking on this issue is cancelled."
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {bookings.map((booking) => {
        const ready = Boolean(booking.copy) && Boolean(booking.ctaUrl)

        return (
          <Card key={booking.id}>
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
              <div className="min-w-0">
                <CardTitle className="text-base">
                  <Link href={`/bookings/${booking.id}`} className="hover:underline">
                    {booking.advertiser.name}
                  </Link>
                </CardTitle>
                <div className="mt-1.5">
                  <AdTypeChip adType={booking.adType} section={booking.section} />
                </div>
              </div>
              <StatusPill value={ready ? 'READY' : 'PLANNING'}>
                {ready ? 'Copy + CTA ready' : 'Needs assets'}
              </StatusPill>
            </CardHeader>

            <CardContent className="flex flex-col gap-3 sm:flex-row">
              <div className="sm:w-40 sm:shrink-0">
                {booking.creativeUrl ? (
                  // Local uploads and remote URLs both work here; plain <img>
                  // avoids next/image remote-host configuration.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={booking.creativeUrl}
                    alt={`${booking.advertiser.name} creative`}
                    className="w-full rounded border border-border bg-muted object-contain"
                  />
                ) : (
                  <div className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded border border-dashed border-border bg-muted/40 text-xs text-muted-foreground">
                    <ImageOff className="size-4" />
                    No creative
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-2 text-sm">
                {booking.copy ? (
                  <p className="whitespace-pre-wrap">{booking.copy}</p>
                ) : (
                  <p className="text-amber-700">No ad copy written yet.</p>
                )}

                {booking.ctaUrl ? (
                  <a
                    href={booking.ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 break-all text-primary hover:underline"
                  >
                    <ExternalLink className="size-3.5 shrink-0" />
                    {booking.ctaUrl}
                  </a>
                ) : (
                  <p className="text-amber-700">No CTA link.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
