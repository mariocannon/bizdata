import Link from 'next/link'
import { AlertTriangle, ExternalLink, Inbox, Mail, Phone } from 'lucide-react'
import { prisma } from '@/lib/db'
import {
  CLASSIFIED_CATEGORIES,
  CLASSIFIED_SOURCES,
  CLASSIFIED_STATUSES,
  label,
} from '@/lib/enums'
import {
  CLASSIFIED_WORD_MAX,
  countWords,
  excerpt,
  isWordCountValid,
  requiresWordCount,
  wordCountMessage,
  wordCountState,
} from '@/lib/classifieds'
import { cn, formatDate } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { FilterBar } from '@/components/filter-bar'
import { ViewToggle } from '@/components/view-toggle'
import { SortHeader } from '@/components/sort-header'
import { StatusPill } from '@/components/status-pill'
import { ExportCsvButton } from '@/components/export-csv-button'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ClassifiedForm } from './classified-form'
import { ExportBeehiivButton } from './export-beehiiv-button'
import { DeleteClassifiedButton } from './delete-classified-button'

export const dynamic = 'force-dynamic'

const CSV_COLUMNS = [
  { header: 'Headline', key: 'headline' },
  { header: 'Copy', key: 'body' },
  { header: 'Words', key: 'words' },
  { header: 'Category', key: 'category' },
  { header: 'Status', key: 'status' },
  { header: 'Source', key: 'source' },
  { header: 'Issue', key: 'issue' },
  { header: 'Publish date', key: 'publishDate' },
  { header: 'Contact name', key: 'contactName' },
  { header: 'Email', key: 'contactEmail' },
  { header: 'Phone', key: 'contactPhone' },
  { header: 'Notes', key: 'notes' },
]

const WORD_COUNT_STYLES: Record<string, string> = {
  empty: 'text-muted-foreground',
  ok: 'text-foreground',
  long: 'text-amber-700',
}

type SearchParams = {
  view?: string
  q?: string
  status?: string
  category?: string
  source?: string
  issueId?: string
  sort?: string
  dir?: string
}

export default async function ClassifiedsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const view = searchParams.view === 'copy' ? 'copy' : 'table'
  const query = searchParams.q?.trim().toLowerCase() ?? ''
  const statusFilter = searchParams.status ?? ''
  const categoryFilter = searchParams.category ?? ''
  const sourceFilter = searchParams.source ?? ''
  const issueFilter = searchParams.issueId ?? ''
  const sort = searchParams.sort ?? 'created'
  const dir = searchParams.dir === 'desc' ? 'desc' : 'asc'

  const [classifieds, issues] = await Promise.all([
    prisma.classified.findMany({
      include: { issue: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.issue.findMany({
      orderBy: { publishDate: 'asc' },
      select: { id: true, title: true, publishDate: true },
    }),
  ])

  const rows = classifieds
    .map((classified) => {
      const words = countWords(classified.body)
      return {
        ...classified,
        words,
        state: wordCountState(words),
        // The word cap only blocks a listing once it is approved or published.
        tooLong: requiresWordCount(classified.status) && !isWordCountValid(words),
      }
    })
    .filter((row) => {
      if (
        query &&
        !`${row.headline} ${row.body} ${row.contactName ?? ''} ${row.contactEmail ?? ''}`
          .toLowerCase()
          .includes(query)
      ) {
        return false
      }
      if (statusFilter && row.status !== statusFilter) return false
      if (categoryFilter && row.category !== categoryFilter) return false
      if (sourceFilter && row.source !== sourceFilter) return false
      if (issueFilter) {
        if (issueFilter === 'unassigned') {
          if (row.issueId) return false
        } else if (row.issueId !== issueFilter) {
          return false
        }
      }
      return true
    })

  rows.sort((a, b) => {
    const factor = dir === 'desc' ? -1 : 1
    switch (sort) {
      case 'headline':
        return a.headline.localeCompare(b.headline) * factor
      case 'category':
        return a.category.localeCompare(b.category) * factor
      case 'status':
        return (
          (CLASSIFIED_STATUSES.indexOf(a.status as never) -
            CLASSIFIED_STATUSES.indexOf(b.status as never)) *
          factor
        )
      case 'words':
        return (a.words - b.words) * factor
      case 'issue': {
        // Unassigned listings sort last in either direction — they are the queue,
        // not part of the running order.
        const left = a.issue?.publishDate.getTime() ?? Infinity
        const right = b.issue?.publishDate.getTime() ?? Infinity
        if (left === Infinity || right === Infinity) return left === right ? 0 : left === Infinity ? 1 : -1
        return (left - right) * factor
      }
      default:
        return (a.createdAt.getTime() - b.createdAt.getTime()) * factor
    }
  })

  const csvRows = rows.map((row) => ({
    headline: row.headline,
    body: row.body,
    words: row.words,
    category: label(row.category),
    status: label(row.status),
    source: label(row.source),
    issue: row.issue?.title ?? '',
    publishDate: row.issue ? row.issue.publishDate.toISOString().slice(0, 10) : '',
    contactName: row.contactName ?? '',
    contactEmail: row.contactEmail ?? '',
    contactPhone: row.contactPhone ?? '',
    notes: row.notes ?? '',
  }))

  // What goes into the newsletter: published listings, from whatever the page
  // is currently filtered to, in the order shown.
  const publishedListings = rows
    .filter((row) => row.status === 'PUBLISHED')
    .map((row) => ({
      headline: row.headline,
      body: row.body,
      category: label(row.category),
      contactName: row.contactName,
      contactEmail: row.contactEmail,
      contactPhone: row.contactPhone,
    }))

  // The usual reason an export comes out empty, worth naming in the message.
  const approvedInView = rows.filter((row) => row.status === 'APPROVED').length

  // Filtered to one issue? Name it under the heading in the exported block.
  const filteredIssue =
    issueFilter && issueFilter !== 'unassigned'
      ? issues.find((issue) => issue.id === issueFilter)
      : undefined

  const issueOptions = issues.map((issue) => ({ id: issue.id, title: issue.title }))
  const needsWork = rows.filter((row) => row.tooLong).length
  // Anything sent in through the public form and not yet looked at.
  const awaitingReview = classifieds.filter(
    (row) => row.source === 'PUBLIC' && row.status === 'DRAFT'
  ).length

  return (
    <>
      <PageHeader
        title="Classifieds"
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="tabular">
              {rows.length} of {classifieds.length} listings
            </span>
            <span>
              Up to {CLASSIFIED_WORD_MAX} words, headline and contact
            </span>
            {awaitingReview > 0 ? (
              <Link
                href="/classifieds?source=PUBLIC&status=DRAFT"
                className="font-medium text-primary hover:underline"
              >
                {awaitingReview} submitted, awaiting review
              </Link>
            ) : null}
            {needsWork > 0 ? (
              <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                <AlertTriangle className="size-3.5" />
                {needsWork} over the word limit
              </span>
            ) : null}
          </span>
        }
        actions={
          <>
            <Button asChild variant="ghost">
              <a href="/submit" target="_blank" rel="noopener noreferrer">
                <ExternalLink />
                Public form
              </a>
            </Button>
            <ExportBeehiivButton
              listings={publishedListings}
              approvedCount={approvedInView}
              subtitle={filteredIssue?.title}
            />
            <ExportCsvButton
              rows={csvRows}
              columns={CSV_COLUMNS}
              filename="the-tide-classifieds"
            />
            <ClassifiedForm issues={issueOptions} />
          </>
        }
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <FilterBar
            search={{ param: 'q', placeholder: 'Search classifieds…' }}
            filters={[
              {
                param: 'status',
                label: 'Status',
                options: CLASSIFIED_STATUSES.map((value) => ({
                  value,
                  label: label(value),
                })),
              },
              {
                param: 'category',
                label: 'Category',
                options: CLASSIFIED_CATEGORIES.map((value) => ({
                  value,
                  label: label(value),
                })),
              },
              {
                param: 'source',
                label: 'Source',
                allLabel: 'Any source',
                options: CLASSIFIED_SOURCES.map((value) => ({
                  value,
                  label: label(value),
                })),
              },
              {
                param: 'issueId',
                label: 'Issue',
                allLabel: 'All issues',
                options: [
                  { value: 'unassigned', label: 'Unassigned' },
                  ...issues.map((issue) => ({ value: issue.id, label: issue.title })),
                ],
              },
            ]}
          />
          <ViewToggle
            current={view}
            options={[
              { value: 'table', label: 'Table' },
              { value: 'copy', label: 'Copy' },
            ]}
          />
        </div>
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState
          title="No classifieds match"
          description={
            classifieds.length === 0
              ? `Add the first listing — a headline, up to ${CLASSIFIED_WORD_MAX} words and a contact number or email.`
              : 'Try clearing the filters or the search term.'
          }
          action={
            classifieds.length === 0 ? <ClassifiedForm issues={issueOptions} /> : null
          }
        />
      ) : view === 'copy' ? (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div className="min-w-0">
                  <CardTitle className="text-base">{row.headline}</CardTitle>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {label(row.category)} ·{' '}
                      {row.issue ? row.issue.title : 'Unassigned'}
                    </span>
                    {row.source === 'PUBLIC' ? <SubmittedChip /> : null}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      'tabular text-xs font-medium',
                      WORD_COUNT_STYLES[row.state]
                    )}
                  >
                    {wordCountMessage(row.words)}
                  </span>
                  <StatusPill value={row.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="whitespace-pre-wrap">{row.body}</p>
                <ContactLine
                  name={row.contactName}
                  email={row.contactEmail}
                  phone={row.contactPhone}
                />
                {row.notes ? (
                  <p className="text-xs italic text-muted-foreground">{row.notes}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>
                  <SortHeader column="headline">Headline</SortHeader>
                </TableHead>
                <TableHead>
                  <SortHeader column="category">Category</SortHeader>
                </TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>
                  <SortHeader column="issue">Issue</SortHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortHeader column="words" align="right">
                    Words
                  </SortHeader>
                </TableHead>
                <TableHead>
                  <SortHeader column="status">Status</SortHeader>
                </TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="max-w-[22rem]">
                    <p className="truncate font-medium" title={row.headline}>
                      {row.headline}
                    </p>
                    {row.source === 'PUBLIC' ? <SubmittedChip /> : null}
                    <p className="truncate text-xs text-muted-foreground">
                      {excerpt(row.body)}
                    </p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {label(row.category)}
                  </TableCell>
                  <TableCell className="text-sm">
                    <ContactLine
                      name={row.contactName}
                      email={row.contactEmail}
                      phone={row.contactPhone}
                      compact
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {row.issue ? (
                      // The title already carries the date, so show it once.
                      <span className="tabular" title={row.issue.title}>
                        {formatDate(row.issue.publishDate)}
                      </span>
                    ) : (
                      <span className="text-xs">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        'tabular font-medium',
                        WORD_COUNT_STYLES[row.state]
                      )}
                      title={wordCountMessage(row.words)}
                    >
                      {row.words}
                    </span>
                    {row.tooLong ? (
                      <AlertTriangle
                        aria-label="Over the word limit"
                        className="ml-1 inline size-3 text-amber-700"
                      />
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <StatusPill value={row.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <ClassifiedForm
                        issues={issueOptions}
                        classified={{
                          id: row.id,
                          headline: row.headline,
                          body: row.body,
                          category: row.category,
                          status: row.status,
                          contactName: row.contactName ?? '',
                          contactEmail: row.contactEmail ?? '',
                          contactPhone: row.contactPhone ?? '',
                          issueId: row.issueId ?? '',
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
                      <DeleteClassifiedButton id={row.id} headline={row.headline} />
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

/** Marks a listing that came in through the public form rather than being typed in. */
function SubmittedChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-100 px-1.5 py-0.5 text-[11px] font-medium text-sky-800">
      <Inbox className="size-3" />
      Submitted
    </span>
  )
}

function ContactLine({
  name,
  email,
  phone,
  compact = false,
}: {
  name: string | null
  email: string | null
  phone: string | null
  compact?: boolean
}) {
  if (!name && !email && !phone) {
    return <span className="text-xs text-amber-700">No contact</span>
  }

  return (
    <div className={cn('flex flex-col gap-0.5', compact ? 'text-xs' : 'text-sm')}>
      {name ? <span className="font-medium">{name}</span> : null}
      {email ? (
        <a
          href={`mailto:${email}`}
          className="inline-flex items-center gap-1 break-words text-primary hover:underline"
        >
          <Mail className="size-3 shrink-0" />
          {email}
        </a>
      ) : null}
      {phone ? (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Phone className="size-3 shrink-0" />
          {phone}
        </span>
      ) : null}
    </div>
  )
}
