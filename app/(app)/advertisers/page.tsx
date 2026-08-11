import Link from 'next/link'
import { CheckCircle2, ExternalLink } from 'lucide-react'
import { prisma } from '@/lib/db'
import { getAdvertiserTotals, ZERO_TOTALS } from '@/lib/rollups'
import { ADVERTISER_CATEGORIES, ADVERTISER_STATUSES, label } from '@/lib/enums'
import { formatDate, formatMoney, toDateInput } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { FilterBar } from '@/components/filter-bar'
import { ViewToggle } from '@/components/view-toggle'
import { SortHeader } from '@/components/sort-header'
import { StatusPill } from '@/components/status-pill'
import { ExportCsvButton } from '@/components/export-csv-button'
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
import { AdvertiserForm } from './advertiser-form'
import { PipelineBoard } from './pipeline-board'

export const dynamic = 'force-dynamic'

const CSV_COLUMNS = [
  { header: 'Name', key: 'name' },
  { header: 'Category', key: 'category' },
  { header: 'Status', key: 'status' },
  { header: 'Contact name', key: 'contactName' },
  { header: 'Email', key: 'email' },
  { header: 'Phone', key: 'phone' },
  { header: 'Website', key: 'website' },
  { header: 'Reviews checked', key: 'reviewsChecked' },
  { header: 'Last contacted', key: 'lastContacted' },
  { header: 'Total booked', key: 'totalBooked' },
  { header: 'Total paid', key: 'totalPaid' },
  { header: 'Notes', key: 'notes' },
]

type SearchParams = {
  view?: string
  q?: string
  status?: string
  category?: string
  sort?: string
  dir?: string
}

export default async function AdvertisersPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const view = searchParams.view === 'pipeline' ? 'pipeline' : 'table'
  const query = searchParams.q?.trim() ?? ''
  const statusFilter = searchParams.status ?? ''
  const categoryFilter = searchParams.category ?? ''
  const sort = searchParams.sort ?? 'name'
  const dir = searchParams.dir === 'desc' ? 'desc' : 'asc'

  const [advertisers, totals] = await Promise.all([
    prisma.advertiser.findMany({ orderBy: { name: 'asc' } }),
    getAdvertiserTotals(),
  ])

  const rows = advertisers
    .map((advertiser) => ({
      ...advertiser,
      totals: totals.get(advertiser.id) ?? ZERO_TOTALS,
    }))
    .filter((row) => {
      if (query && !row.name.toLowerCase().includes(query.toLowerCase())) return false
      if (statusFilter && row.status !== statusFilter) return false
      if (categoryFilter && row.category !== categoryFilter) return false
      return true
    })

  rows.sort((a, b) => {
    const factor = dir === 'desc' ? -1 : 1
    switch (sort) {
      case 'category':
        return label(a.category).localeCompare(label(b.category)) * factor
      case 'status':
        return (
          (ADVERTISER_STATUSES.indexOf(a.status as never) -
            ADVERTISER_STATUSES.indexOf(b.status as never)) *
          factor
        )
      case 'booked':
        return (a.totals.booked - b.totals.booked) * factor
      case 'paid':
        return (a.totals.paid - b.totals.paid) * factor
      case 'lastContacted':
        return (
          ((a.lastContacted?.getTime() ?? 0) - (b.lastContacted?.getTime() ?? 0)) * factor
        )
      default:
        return a.name.localeCompare(b.name) * factor
    }
  })

  const csvRows = rows.map((row) => ({
    name: row.name,
    category: label(row.category),
    status: label(row.status),
    contactName: row.contactName ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    website: row.website ?? '',
    reviewsChecked: row.reviewsChecked,
    lastContacted: row.lastContacted ? row.lastContacted.toISOString().slice(0, 10) : '',
    totalBooked: row.totals.booked,
    totalPaid: row.totals.paid,
    notes: row.notes ?? '',
  }))

  const totalBooked = rows.reduce((sum, row) => sum + row.totals.booked, 0)

  return (
    <>
      <PageHeader
        title="Advertisers"
        description={
          <span className="tabular">
            {rows.length} of {advertisers.length} · {formatMoney(totalBooked)} booked
          </span>
        }
        actions={
          <>
            <ExportCsvButton
              rows={csvRows}
              columns={CSV_COLUMNS}
              filename="the-tide-advertisers"
            />
            <AdvertiserForm />
          </>
        }
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <FilterBar
            search={{ param: 'q', placeholder: 'Search advertisers…' }}
            filters={[
              {
                param: 'status',
                label: 'Status',
                options: ADVERTISER_STATUSES.map((value) => ({
                  value,
                  label: label(value),
                })),
              },
              {
                param: 'category',
                label: 'Category',
                options: ADVERTISER_CATEGORIES.map((value) => ({
                  value,
                  label: label(value),
                })),
              },
            ]}
          />
          <ViewToggle
            current={view}
            options={[
              { value: 'table', label: 'Table' },
              { value: 'pipeline', label: 'Pipeline' },
            ]}
          />
        </div>
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState
          title="No advertisers match"
          description={
            advertisers.length === 0
              ? 'Add the first business you want to sell to.'
              : 'Try clearing the filters or the search term.'
          }
          action={advertisers.length === 0 ? <AdvertiserForm /> : null}
        />
      ) : view === 'pipeline' ? (
        <PipelineBoard
          advertisers={rows.map((row) => ({
            id: row.id,
            name: row.name,
            category: row.category,
            status: row.status,
            booked: row.totals.booked,
            outstanding: row.totals.outstanding,
          }))}
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>
                  <SortHeader column="name">Name</SortHeader>
                </TableHead>
                <TableHead>
                  <SortHeader column="category">Category</SortHeader>
                </TableHead>
                <TableHead>
                  <SortHeader column="status">Status</SortHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortHeader column="booked" align="right">
                    Booked
                  </SortHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortHeader column="paid" align="right">
                    Paid
                  </SortHeader>
                </TableHead>
                <TableHead>
                  <SortHeader column="lastContacted">Last contacted</SortHeader>
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/advertisers/${row.id}`}
                        className="font-medium hover:underline"
                      >
                        {row.name}
                      </Link>
                      {row.reviewsChecked ? (
                        <CheckCircle2
                          className="size-3.5 text-success"
                          aria-label="Reviews checked"
                        />
                      ) : null}
                    </div>
                    {row.contactName ? (
                      <p className="text-xs text-muted-foreground">{row.contactName}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {label(row.category)}
                  </TableCell>
                  <TableCell>
                    <StatusPill value={row.status} />
                  </TableCell>
                  <TableCell className="tabular text-right font-medium">
                    {formatMoney(row.totals.booked)}
                  </TableCell>
                  <TableCell className="tabular text-right">
                    {formatMoney(row.totals.paid)}
                    {row.totals.outstanding > 0 ? (
                      <span className="block text-xs text-attention">
                        {formatMoney(row.totals.outstanding)} due
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="tabular text-muted-foreground">
                    {formatDate(row.lastContacted)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {row.website ? (
                        <a
                          href={row.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={`Open ${row.name} website`}
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      ) : null}
                      <AdvertiserForm
                        advertiser={{
                          id: row.id,
                          name: row.name,
                          category: row.category,
                          status: row.status,
                          contactName: row.contactName ?? '',
                          email: row.email ?? '',
                          phone: row.phone ?? '',
                          website: row.website ?? '',
                          reviewsChecked: row.reviewsChecked,
                          lastContacted: toDateInput(row.lastContacted),
                          notes: row.notes ?? '',
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
                    </div>
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
