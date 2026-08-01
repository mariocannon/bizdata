import Link from 'next/link'
import { format } from 'date-fns'
import { AlertTriangle } from 'lucide-react'
import { prisma } from '@/lib/db'
import { getIssueTotals, ZERO_TOTALS } from '@/lib/rollups'
import { getCapacityReports } from '@/lib/inventory'
import { ISSUE_STATUSES, label } from '@/lib/enums'
import { formatDate, formatMoney, toDateInput } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { FilterBar } from '@/components/filter-bar'
import { ViewToggle } from '@/components/view-toggle'
import { SortHeader } from '@/components/sort-header'
import { StatusPill } from '@/components/status-pill'
import { ExportCsvButton } from '@/components/export-csv-button'
import { MonthCalendar } from '@/components/month-calendar'
import { monthFromParam } from '@/lib/calendar'
import { EmptyState } from '@/components/ui/empty-state'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { IssueForm } from './issue-form'

export const dynamic = 'force-dynamic'

const CSV_COLUMNS = [
  { header: 'Title', key: 'title' },
  { header: 'Publish date', key: 'publishDate' },
  { header: 'Status', key: 'status' },
  { header: 'Ads sold', key: 'adsSold' },
  { header: 'Revenue', key: 'revenue' },
  { header: 'Theme', key: 'theme' },
]

type SearchParams = {
  view?: string
  q?: string
  status?: string
  sort?: string
  dir?: string
  month?: string
}

export default async function IssuesPage({ searchParams }: { searchParams: SearchParams }) {
  const view = searchParams.view === 'calendar' ? 'calendar' : 'table'
  const query = searchParams.q?.trim().toLowerCase() ?? ''
  const statusFilter = searchParams.status ?? ''
  const sort = searchParams.sort ?? 'publishDate'
  const dir = searchParams.dir === 'desc' ? 'desc' : 'asc'

  const issues = await prisma.issue.findMany({ orderBy: { publishDate: 'asc' } })
  const [totals, reports] = await Promise.all([
    getIssueTotals(),
    getCapacityReports(issues.map((issue) => issue.id)),
  ])

  const rows = issues
    .map((issue) => ({
      ...issue,
      totals: totals.get(issue.id) ?? ZERO_TOTALS,
      report: reports[issue.id],
    }))
    .filter((row) => {
      if (query && !row.title.toLowerCase().includes(query)) return false
      if (statusFilter && row.status !== statusFilter) return false
      return true
    })

  rows.sort((a, b) => {
    const factor = dir === 'desc' ? -1 : 1
    switch (sort) {
      case 'title':
        return a.title.localeCompare(b.title) * factor
      case 'status':
        return (
          (ISSUE_STATUSES.indexOf(a.status as never) -
            ISSUE_STATUSES.indexOf(b.status as never)) *
          factor
        )
      case 'sold':
        return ((a.report?.totalSold ?? 0) - (b.report?.totalSold ?? 0)) * factor
      case 'revenue':
        return (a.totals.booked - b.totals.booked) * factor
      default:
        return (a.publishDate.getTime() - b.publishDate.getTime()) * factor
    }
  })

  const csvRows = rows.map((row) => ({
    title: row.title,
    publishDate: row.publishDate.toISOString().slice(0, 10),
    status: label(row.status),
    adsSold: row.report?.totalSold ?? 0,
    revenue: row.totals.booked,
    theme: row.theme ?? '',
  }))

  const month = format(monthFromParam(searchParams.month), 'yyyy-MM')

  return (
    <>
      <PageHeader
        title="Issues"
        description={
          <span className="tabular">
            {rows.length} of {issues.length} issues
          </span>
        }
        actions={
          <>
            <ExportCsvButton rows={csvRows} columns={CSV_COLUMNS} filename="the-tide-issues" />
            <IssueForm />
          </>
        }
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <FilterBar
            search={{ param: 'q', placeholder: 'Search issues…' }}
            filters={[
              {
                param: 'status',
                label: 'Status',
                options: ISSUE_STATUSES.map((value) => ({ value, label: label(value) })),
              },
            ]}
          />
          <ViewToggle
            current={view}
            options={[
              { value: 'table', label: 'Table' },
              { value: 'calendar', label: 'Calendar' },
            ]}
          />
        </div>
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState
          title="No issues match"
          description={
            issues.length === 0
              ? 'Create the first issue so you have somewhere to sell ads into.'
              : 'Try clearing the filters or the search term.'
          }
          action={issues.length === 0 ? <IssueForm /> : null}
        />
      ) : view === 'calendar' ? (
        <MonthCalendar
          month={month}
          emptyLabel="No issues publish in this month."
          events={rows.map((row) => ({
            id: row.id,
            date: format(row.publishDate, 'yyyy-MM-dd'),
            title: row.title.replace(/^The Tide — /, ''),
            subtitle: `${row.report?.totalSold ?? 0}/${row.report?.totalCap ?? 0} slots`,
            href: `/issues/${row.id}`,
            className: row.report?.oversold
              ? 'bg-red-100 text-red-800'
              : 'bg-tide-100 text-tide-800',
          }))}
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>
                  <SortHeader column="title">Issue</SortHeader>
                </TableHead>
                <TableHead>
                  <SortHeader column="publishDate">Publish date</SortHeader>
                </TableHead>
                <TableHead>
                  <SortHeader column="status">Status</SortHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortHeader column="sold" align="right">
                    Sold / capacity
                  </SortHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortHeader column="revenue" align="right">
                    Revenue
                  </SortHeader>
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/issues/${row.id}`} className="font-medium hover:underline">
                      {row.title}
                    </Link>
                    {row.theme ? (
                      <p className="max-w-md truncate text-xs text-muted-foreground">
                        {row.theme}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="tabular text-muted-foreground">
                    {formatDate(row.publishDate)}
                  </TableCell>
                  <TableCell>
                    <StatusPill value={row.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="tabular font-medium">
                      {row.report?.totalSold ?? 0} / {row.report?.totalCap ?? 0}
                    </span>
                    {row.report?.oversold ? (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                        <AlertTriangle className="size-3" />
                        Oversold
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="tabular text-right font-medium">
                    {formatMoney(row.totals.booked)}
                  </TableCell>
                  <TableCell className="text-right">
                    <IssueForm
                      issue={{
                        id: row.id,
                        title: row.title,
                        publishDate: toDateInput(row.publishDate),
                        status: row.status,
                        theme: row.theme ?? '',
                      }}
                      trigger={
                        <button
                          type="button"
                          className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          Edit
                        </button>
                      }
                    />
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
