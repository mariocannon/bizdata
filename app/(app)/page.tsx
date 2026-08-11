import Link from 'next/link'
import { format } from 'date-fns'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { prisma } from '@/lib/db'
import { getCapacityReports } from '@/lib/inventory'
import { getSettings } from '@/lib/settings'
import { ADVERTISER_STATUSES, label } from '@/lib/enums'
import { inRange, isPeriod, periodRange, type Period } from '@/lib/period'
import { formatDate, formatMoney, formatPercent } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { PeriodSelector } from '@/components/period-selector'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { RevenueByIssueChart, BreakdownBarChart } from '@/components/dashboard/charts'
import { StatusPill } from '@/components/status-pill'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { period?: string }
}) {
  const period: Period = isPeriod(searchParams.period) ? searchParams.period : 'month'
  const range = periodRange(period)

  const [issues, bookings, advertisers, settings] = await Promise.all([
    prisma.issue.findMany({ orderBy: { publishDate: 'asc' } }),
    prisma.booking.findMany({
      include: { advertiser: true, issue: true },
      orderBy: { issue: { publishDate: 'asc' } },
    }),
    prisma.advertiser.findMany(),
    getSettings(),
  ])

  const reports = await getCapacityReports(issues.map((issue) => issue.id))

  // Revenue is attributed to the issue's publish date, and cancelled bookings
  // never count — anywhere on this page.
  const issuesInPeriod = issues.filter((issue) => inRange(issue.publishDate, range))
  const issueIdsInPeriod = new Set(issuesInPeriod.map((issue) => issue.id))

  const live = bookings.filter((booking) => booking.status !== 'CANCELLED')
  const inPeriod = live.filter((booking) => issueIdsInPeriod.has(booking.issueId))

  const booked = inPeriod.reduce((sum, booking) => sum + booking.price, 0)
  const collected = inPeriod
    .filter((booking) => booking.paid === 'PAID')
    .reduce((sum, booking) => sum + booking.price, 0)
  const outstanding = inPeriod
    .filter((booking) => booking.paid === 'UNPAID' || booking.paid === 'INVOICED')
    .reduce((sum, booking) => sum + booking.price, 0)

  const slotsSold = issuesInPeriod.reduce(
    (sum, issue) => sum + (reports[issue.id]?.totalSold ?? 0),
    0
  )
  const slotsAvailable = issuesInPeriod.reduce(
    (sum, issue) => sum + (reports[issue.id]?.totalCap ?? 0),
    0
  )
  const sellThrough = slotsAvailable > 0 ? slotsSold / slotsAvailable : 0

  const activePartners = advertisers.filter(
    (advertiser) => advertiser.status === 'ACTIVE'
  ).length

  // --- Charts -------------------------------------------------------------
  const revenueByIssue = issuesInPeriod.map((issue) => {
    const issueBookings = inPeriod.filter((booking) => booking.issueId === issue.id)
    return {
      issue: format(issue.publishDate, 'd MMM'),
      collected: issueBookings
        .filter((booking) => booking.paid === 'PAID')
        .reduce((sum, booking) => sum + booking.price, 0),
      outstanding: issueBookings
        .filter((booking) => booking.paid !== 'PAID')
        .reduce((sum, booking) => sum + booking.price, 0),
    }
  })

  function breakdown(key: (booking: (typeof inPeriod)[number]) => string) {
    const totals = new Map<string, number>()
    for (const booking of inPeriod) {
      const bucket = key(booking)
      totals.set(bucket, (totals.get(bucket) ?? 0) + booking.price)
    }
    return [...totals.entries()]
      .map(([name, value]) => ({ name, value }))
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value)
  }

  const revenueByAdType = breakdown((booking) => label(booking.adType))
  const revenueByCategory = breakdown((booking) => label(booking.advertiser.category))

  // --- Lists --------------------------------------------------------------
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingIssues = issues
    .filter((issue) => issue.publishDate >= today)
    .slice(0, 6)

  const chaseList = live
    .filter((booking) => booking.paid !== 'PAID')
    .sort((a, b) => b.price - a.price)
    .slice(0, 6)

  const chaseTotal = live
    .filter((booking) => booking.paid !== 'PAID')
    .reduce((sum, booking) => sum + booking.price, 0)

  const pipeline = ADVERTISER_STATUSES.map((status) => ({
    status,
    count: advertisers.filter((advertiser) => advertiser.status === status).length,
  }))

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${range.label} · revenue is counted against each booking's issue publish date`}
        actions={<PeriodSelector current={period} />}
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Booked revenue"
          value={formatMoney(booked)}
          sublabel={`${issuesInPeriod.length} ${issuesInPeriod.length === 1 ? 'issue' : 'issues'} in period`}
          href="/bookings"
        />
        <KpiCard
          label="Collected"
          value={formatMoney(collected)}
          sublabel={booked > 0 ? `${formatPercent(collected / booked)} of booked` : 'Nothing booked'}
          tone="positive"
          href="/bookings?paid=PAID"
        />
        <KpiCard
          label="Outstanding"
          value={formatMoney(outstanding)}
          sublabel="Unpaid + invoiced"
          tone={outstanding > 0 ? 'warning' : 'default'}
          href="/bookings?view=unpaid"
        />
        <KpiCard
          label="Ads sold"
          value={String(inPeriod.length)}
          sublabel="Excludes cancelled"
          href="/bookings"
        />
        <KpiCard
          label="Sell-through"
          value={formatPercent(sellThrough)}
          sublabel={`${slotsSold} of ${slotsAvailable} slots`}
          href="/issues"
        />
        <KpiCard
          label="Active partners"
          value={String(activePartners)}
          sublabel={`of ${advertisers.length} advertisers`}
          href="/advertisers?status=ACTIVE"
        />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue by issue</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueByIssueChart data={revenueByIssue} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by ad type</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownBarChart data={revenueByAdType} height={Math.max(180, revenueByAdType.length * 34)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by advertiser category</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownBarChart
              data={revenueByCategory}
              height={Math.max(180, revenueByCategory.length * 34)}
            />
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Upcoming issues</CardTitle>
            <Link
              href="/issues"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              All issues <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {upcomingIssues.length === 0 ? (
              <EmptyState title="Nothing scheduled" description="Add your next issue." />
            ) : (
              upcomingIssues.map((issue) => {
                const report = reports[issue.id]
                return (
                  <Link
                    key={issue.id}
                    href={`/issues/${issue.id}`}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="tabular truncate text-sm font-medium">
                        {formatDate(issue.publishDate)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {issue.theme ?? label(issue.status)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {report?.oversold ? (
                        <AlertTriangle
                          className="size-3.5 text-danger"
                          aria-label="Oversold"
                        />
                      ) : null}
                      <span className="tabular text-sm font-medium">
                        {report?.totalSold ?? 0} / {report?.totalCap ?? 0}
                      </span>
                    </div>
                  </Link>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Chase list</CardTitle>
            <Link
              href="/bookings?view=unpaid"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              All unpaid <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {chaseList.length === 0 ? (
              <EmptyState title="Nothing outstanding" description="Everything is paid." />
            ) : (
              <>
                {chaseList.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/bookings/${booking.id}`}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {booking.advertiser.name}
                      </p>
                      <p className="tabular text-xs text-muted-foreground">
                        {formatDate(booking.issue.publishDate)} · {label(booking.adType)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusPill value={booking.paid} />
                      <span className="tabular text-sm font-medium">
                        {formatMoney(booking.price)}
                      </span>
                    </div>
                  </Link>
                ))}
                <p className="tabular mt-1 border-t border-border px-2 pt-2 text-xs text-muted-foreground">
                  {formatMoney(chaseTotal)} outstanding in total
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Pipeline</CardTitle>
            <Link
              href="/advertisers?view=pipeline"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Open board <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {pipeline.map(({ status, count }) => (
              <Link
                key={status}
                href={`/advertisers?status=${status}`}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted"
              >
                <StatusPill value={status} />
                <span className="tabular text-sm font-medium">{count}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </>
  )
}
