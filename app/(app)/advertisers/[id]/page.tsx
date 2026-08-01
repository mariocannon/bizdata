import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  CheckCircle2,
  ExternalLink,
  Mail,
  Phone,
  Plus,
  ShieldAlert,
  User,
} from 'lucide-react'
import { prisma } from '@/lib/db'
import { sumBookings } from '@/lib/rollups'
import { label } from '@/lib/enums'
import { formatDate, formatMoney, toDateInput } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { StatusPill } from '@/components/status-pill'
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
import { AdvertiserForm } from '../advertiser-form'
import { DeleteAdvertiserButton } from './delete-advertiser-button'

export const dynamic = 'force-dynamic'

export default async function AdvertiserDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const advertiser = await prisma.advertiser.findUnique({
    where: { id: params.id },
    include: {
      bookings: {
        include: { issue: true },
        orderBy: { issue: { publishDate: 'desc' } },
      },
    },
  })

  if (!advertiser) notFound()

  const totals = sumBookings(advertiser.bookings)

  return (
    <>
      <PageHeader
        backHref="/advertisers"
        backLabel="All advertisers"
        title={
          <span className="flex items-center gap-2">
            {advertiser.name}
            <StatusPill value={advertiser.status} />
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{label(advertiser.category)}</span>
            {advertiser.reviewsChecked ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="size-3.5" />
                Reviews checked
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-700">
                <ShieldAlert className="size-3.5" />
                Reviews not checked
              </span>
            )}
            <span>Last contacted {formatDate(advertiser.lastContacted)}</span>
          </span>
        }
        actions={
          <>
            <DeleteAdvertiserButton
              id={advertiser.id}
              name={advertiser.name}
              bookingCount={advertiser.bookings.length}
            />
            <AdvertiserForm
              advertiser={{
                id: advertiser.id,
                name: advertiser.name,
                category: advertiser.category,
                status: advertiser.status,
                contactName: advertiser.contactName ?? '',
                email: advertiser.email ?? '',
                phone: advertiser.phone ?? '',
                website: advertiser.website ?? '',
                reviewsChecked: advertiser.reviewsChecked,
                lastContacted: toDateInput(advertiser.lastContacted),
                notes: advertiser.notes ?? '',
              }}
              trigger={<Button variant="outline">Edit</Button>}
            />
            <Button asChild>
              <Link href={`/bookings/new?advertiserId=${advertiser.id}`}>
                <Plus />
                New booking
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5 text-sm">
            {advertiser.contactName ? (
              <p className="flex items-center gap-2">
                <User className="size-4 text-muted-foreground" />
                {advertiser.contactName}
              </p>
            ) : null}
            {advertiser.email ? (
              <a
                href={`mailto:${advertiser.email}`}
                className="flex items-center gap-2 hover:underline"
              >
                <Mail className="size-4 text-muted-foreground" />
                {advertiser.email}
              </a>
            ) : null}
            {advertiser.phone ? (
              <a
                href={`tel:${advertiser.phone.replace(/\s/g, '')}`}
                className="flex items-center gap-2 hover:underline"
              >
                <Phone className="size-4 text-muted-foreground" />
                {advertiser.phone}
              </a>
            ) : null}
            {advertiser.website ? (
              <a
                href={advertiser.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 break-all hover:underline"
              >
                <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                {advertiser.website.replace(/^https?:\/\//, '')}
              </a>
            ) : null}
            {!advertiser.contactName &&
            !advertiser.email &&
            !advertiser.phone &&
            !advertiser.website ? (
              <p className="text-muted-foreground">No contact details yet.</p>
            ) : null}

            {advertiser.notes ? (
              <p className="mt-2 whitespace-pre-wrap border-t border-border pt-3 text-muted-foreground">
                {advertiser.notes}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Totals</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Booked" value={formatMoney(totals.booked)} />
            <Stat label="Paid" value={formatMoney(totals.paid)} tone="positive" />
            <Stat
              label="Outstanding"
              value={formatMoney(totals.outstanding)}
              tone={totals.outstanding > 0 ? 'warning' : 'default'}
            />
            <Stat label="Bookings" value={String(totals.bookings)} />
          </CardContent>
        </Card>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Bookings
        </h2>

        {advertiser.bookings.length === 0 ? (
          <EmptyState
            title="No bookings yet"
            description="Sell this advertiser a slot in an upcoming issue."
            action={
              <Button asChild>
                <Link href={`/bookings/new?advertiserId=${advertiser.id}`}>
                  <Plus />
                  New booking
                </Link>
              </Button>
            }
          />
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Issue</TableHead>
                  <TableHead>Ad type</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advertiser.bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="font-medium hover:underline"
                      >
                        {booking.issue.title}
                      </Link>
                      <p className="tabular text-xs text-muted-foreground">
                        {formatDate(booking.issue.publishDate)}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {label(booking.adType)}
                      {booking.section ? ` · ${label(booking.section)}` : ''}
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
      </section>
    </>
  )
}

function Stat({
  label: statLabel,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'positive' | 'warning'
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {statLabel}
      </p>
      <p
        className={
          'tabular mt-1 text-2xl font-semibold ' +
          (tone === 'positive'
            ? 'text-emerald-700'
            : tone === 'warning'
              ? 'text-amber-700'
              : 'text-foreground')
        }
      >
        {value}
      </p>
    </div>
  )
}
