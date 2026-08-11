import Link from 'next/link'
import {
  AlertTriangle,
  CalendarDays,
  ExternalLink,
  Inbox,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react'
import { prisma } from '@/lib/db'
import {
  CLASSIFIED_SOURCES,
  EVENT_CATEGORIES,
  EVENT_STATUSES,
  label,
} from '@/lib/enums'
import {
  countWords,
  excerpt,
  isWordCountValid,
  wordCountMessage,
  wordCountState,
} from '@/lib/classifieds'
import {
  EVENT_WORD_MAX,
  eventMeta,
  formatEventWhen,
  isUpcoming,
  requiresWordCount,
} from '@/lib/events'
import { cn, formatDate, toDateInput, toTimeInput } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { FilterBar } from '@/components/filter-bar'
import { ViewToggle } from '@/components/view-toggle'
import { SortHeader } from '@/components/sort-header'
import { StatusPill } from '@/components/status-pill'
import { ExportCsvButton } from '@/components/export-csv-button'
import { Button } from '@/components/ui/button'
import { ExportBeehiivButton } from '@/components/export-beehiiv-button'
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
import { EventForm } from './event-form'
import { DeleteEventButton } from './delete-event-button'

export const dynamic = 'force-dynamic'

const CSV_COLUMNS = [
  { header: 'Event', key: 'title' },
  { header: 'Start date', key: 'startDate' },
  { header: 'Start time', key: 'startTime' },
  { header: 'End date', key: 'endDate' },
  { header: 'End time', key: 'endTime' },
  { header: 'When', key: 'when' },
  { header: 'Where', key: 'location' },
  { header: 'Copy', key: 'body' },
  { header: 'Words', key: 'words' },
  { header: 'Category', key: 'category' },
  { header: 'Status', key: 'status' },
  { header: 'Source', key: 'source' },
  { header: 'Issue', key: 'issue' },
  { header: 'Tickets URL', key: 'ticketUrl' },
  { header: 'Contact name', key: 'contactName' },
  { header: 'Email', key: 'contactEmail' },
  { header: 'Phone', key: 'contactPhone' },
  { header: 'Notes', key: 'notes' },
]

const WORD_COUNT_STYLES: Record<string, string> = {
  empty: 'text-muted-foreground',
  ok: 'text-foreground',
  long: 'text-attention',
}

type SearchParams = {
  view?: string
  q?: string
  status?: string
  category?: string
  source?: string
  when?: string
  issueId?: string
  sort?: string
  dir?: string
}

export default async function EventsPage({ searchParams }: { searchParams: SearchParams }) {
  const view = searchParams.view === 'copy' ? 'copy' : 'table'
  const query = searchParams.q?.trim().toLowerCase() ?? ''
  const statusFilter = searchParams.status ?? ''
  const categoryFilter = searchParams.category ?? ''
  const sourceFilter = searchParams.source ?? ''
  const whenFilter = searchParams.when ?? ''
  const issueFilter = searchParams.issueId ?? ''
  // Dates are what an events list is for, so it opens in date order.
  const sort = searchParams.sort ?? 'when'
  const dir = searchParams.dir === 'desc' ? 'desc' : 'asc'

  const [events, issues] = await Promise.all([
    prisma.event.findMany({ include: { issue: true }, orderBy: { startsAt: 'asc' } }),
    prisma.issue.findMany({
      orderBy: { publishDate: 'asc' },
      select: { id: true, title: true, publishDate: true },
    }),
  ])

  const now = new Date()

  const rows = events
    .map((event) => {
      const words = countWords(event.body)
      return {
        ...event,
        words,
        state: wordCountState(words),
        when: formatEventWhen(event.startsAt, event.endsAt),
        // The table column is tight, and the year is rarely the surprise.
        whenShort: formatEventWhen(event.startsAt, event.endsAt, { year: false }),
        upcoming: isUpcoming(event.startsAt, event.endsAt, now),
        // The word cap only blocks a listing once it is approved or published.
        tooLong: requiresWordCount(event.status) && !isWordCountValid(words),
      }
    })
    .filter((row) => {
      if (
        query &&
        !`${row.title} ${row.body} ${row.location ?? ''} ${row.contactName ?? ''}`
          .toLowerCase()
          .includes(query)
      ) {
        return false
      }
      if (statusFilter && row.status !== statusFilter) return false
      if (categoryFilter && row.category !== categoryFilter) return false
      if (sourceFilter && row.source !== sourceFilter) return false
      if (whenFilter === 'upcoming' && !row.upcoming) return false
      if (whenFilter === 'past' && row.upcoming) return false
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
      case 'title':
        return a.title.localeCompare(b.title) * factor
      case 'category':
        return a.category.localeCompare(b.category) * factor
      case 'location':
        return (a.location ?? '').localeCompare(b.location ?? '') * factor
      case 'status':
        return (
          (EVENT_STATUSES.indexOf(a.status as never) -
            EVENT_STATUSES.indexOf(b.status as never)) *
          factor
        )
      case 'words':
        return (a.words - b.words) * factor
      case 'issue': {
        // Unassigned listings sort last either way — they are the queue, not
        // part of a running order.
        const left = a.issue?.publishDate.getTime() ?? Infinity
        const right = b.issue?.publishDate.getTime() ?? Infinity
        if (left === Infinity || right === Infinity)
          return left === right ? 0 : left === Infinity ? 1 : -1
        return (left - right) * factor
      }
      default:
        return (a.startsAt.getTime() - b.startsAt.getTime()) * factor
    }
  })

  const csvRows = rows.map((row) => ({
    title: row.title,
    // Machine-sortable columns alongside the readable one, so the file sorts by
    // date in a spreadsheet without anyone parsing "Sat 15 Aug".
    startDate: toDateInput(row.startsAt),
    startTime: toTimeInput(row.startsAt),
    endDate: row.endsAt ? toDateInput(row.endsAt) : '',
    endTime: row.endsAt ? toTimeInput(row.endsAt) : '',
    when: row.when,
    location: row.location ?? '',
    body: row.body,
    words: row.words,
    category: label(row.category),
    status: label(row.status),
    source: label(row.source),
    issue: row.issue?.title ?? '',
    ticketUrl: row.ticketUrl ?? '',
    contactName: row.contactName ?? '',
    contactEmail: row.contactEmail ?? '',
    contactPhone: row.contactPhone ?? '',
    notes: row.notes ?? '',
  }))

  // What goes into the newsletter: published events, in the order shown.
  const publishedListings = rows
    .filter((row) => row.status === 'PUBLISHED')
    .map((row) => ({
      headline: row.title,
      body: row.body,
      category: label(row.category),
      meta: eventMeta(row.startsAt, row.endsAt, row.location),
      contactName: row.contactName,
      contactEmail: row.contactEmail,
      contactPhone: row.contactPhone,
    }))

  const approvedInView = rows.filter((row) => row.status === 'APPROVED').length

  // A finished event in next week's newsletter is the obvious way to get this
  // wrong, so the export says so rather than quietly including it.
  const pastPublished = rows.filter(
    (row) => row.status === 'PUBLISHED' && !row.upcoming
  ).length

  const filteredIssue =
    issueFilter && issueFilter !== 'unassigned'
      ? issues.find((issue) => issue.id === issueFilter)
      : undefined

  const issueOptions = issues.map((issue) => ({ id: issue.id, title: issue.title }))
  const needsWork = rows.filter((row) => row.tooLong).length
  const upcomingCount = events.filter((event) =>
    isUpcoming(event.startsAt, event.endsAt, now)
  ).length
  // Anything sent in through the public form and not yet looked at.
  const awaitingReview = events.filter(
    (row) => row.source === 'PUBLIC' && row.status === 'DRAFT'
  ).length

  return (
    <>
      <PageHeader
        title="Events"
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="tabular">
              {rows.length} of {events.length} events
            </span>
            <span className="tabular">{upcomingCount} still to come</span>
            {awaitingReview > 0 ? (
              <Link
                href="/events?source=PUBLIC&status=DRAFT"
                className="font-medium text-steel hover:underline"
              >
                {awaitingReview} submitted, awaiting review
              </Link>
            ) : null}
            <span>Up to {EVENT_WORD_MAX} words, when, where and a contact</span>
            {needsWork > 0 ? (
              <span className="inline-flex items-center gap-1 font-medium text-attention">
                <AlertTriangle className="size-3.5" />
                {needsWork} over the word limit
              </span>
            ) : null}
          </span>
        }
        actions={
          <>
            <Button asChild variant="ghost">
              <a href="/submit/event" target="_blank" rel="noopener noreferrer">
                <ExternalLink />
                Public form
              </a>
            </Button>
            <ExportBeehiivButton
              listings={publishedListings}
              approvedCount={approvedInView}
              subtitle={filteredIssue?.title}
              title="What's on"
              filenameBase="the-tide-events"
              noun="event"
              // Events read as a diary; category headings break the date order.
              groupByCategory={false}
              note={
                pastPublished > 0
                  ? `${pastPublished} ${
                      pastPublished === 1 ? 'has' : 'have'
                    } already been — filter to Upcoming to leave ${
                      pastPublished === 1 ? 'it' : 'them'
                    } out.`
                  : undefined
              }
            />
            <ExportCsvButton
              rows={csvRows}
              columns={CSV_COLUMNS}
              filename="the-tide-events"
            />
            <EventForm issues={issueOptions} />
          </>
        }
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <FilterBar
            search={{ param: 'q', placeholder: 'Search events…' }}
            filters={[
              {
                param: 'when',
                label: 'When',
                allLabel: 'Any date',
                options: [
                  { value: 'upcoming', label: 'Upcoming' },
                  { value: 'past', label: 'Past' },
                ],
              },
              {
                param: 'status',
                label: 'Status',
                options: EVENT_STATUSES.map((value) => ({ value, label: label(value) })),
              },
              {
                param: 'category',
                label: 'Category',
                options: EVENT_CATEGORIES.map((value) => ({
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
          title="No events match"
          description={
            events.length === 0
              ? `Add the first event — when and where it is, up to ${EVENT_WORD_MAX} words, and a contact.`
              : 'Try clearing the filters or the search term.'
          }
          action={events.length === 0 ? <EventForm issues={issueOptions} /> : null}
        />
      ) : view === 'copy' ? (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div className="min-w-0">
                  <CardTitle className="text-base">{row.title}</CardTitle>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-medium text-steel">
                    <CalendarDays className="size-3.5 shrink-0" />
                    {eventMeta(row.startsAt, row.endsAt, row.location)}
                  </p>
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
                {row.ticketUrl ? (
                  <a
                    href={row.ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 break-all text-steel hover:underline"
                  >
                    <ExternalLink className="size-3.5 shrink-0" />
                    {row.ticketUrl}
                  </a>
                ) : null}
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
                  <SortHeader column="when">When</SortHeader>
                </TableHead>
                <TableHead>
                  <SortHeader column="title">Event</SortHeader>
                </TableHead>
                <TableHead>
                  <SortHeader column="location">Where</SortHeader>
                </TableHead>
                <TableHead>
                  <SortHeader column="category">Category</SortHeader>
                </TableHead>
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
                <TableRow key={row.id} className={cn(!row.upcoming && 'opacity-60')}>
                  <TableCell className="min-w-[9rem]">
                    <span className="tabular font-medium" title={row.when}>
                      {row.whenShort}
                    </span>
                    {!row.upcoming ? (
                      <span className="block text-xs text-muted-foreground">Been and gone</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="max-w-[16rem]">
                    <p className="truncate font-medium" title={row.title}>
                      {row.title}
                    </p>
                    {row.source === 'PUBLIC' ? <SubmittedChip /> : null}
                    <p className="truncate text-xs text-muted-foreground">
                      {excerpt(row.body)}
                    </p>
                  </TableCell>
                  <TableCell className="max-w-[10rem] text-sm text-muted-foreground">
                    {row.location ? (
                      <span className="flex items-start gap-1">
                        <MapPin className="mt-0.5 size-3 shrink-0" />
                        <span className="truncate" title={row.location}>
                          {row.location}
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {label(row.category)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {row.issue ? (
                      <span className="tabular" title={row.issue.title}>
                        {formatDate(row.issue.publishDate)}
                      </span>
                    ) : (
                      <span className="text-xs">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn('tabular font-medium', WORD_COUNT_STYLES[row.state])}
                      title={wordCountMessage(row.words)}
                    >
                      {row.words}
                    </span>
                    {row.tooLong ? (
                      <AlertTriangle
                        aria-label="Over the word limit"
                        className="ml-1 inline size-3 text-attention"
                      />
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <StatusPill value={row.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <EventForm
                        issues={issueOptions}
                        event={{
                          id: row.id,
                          title: row.title,
                          body: row.body,
                          startDate: toDateInput(row.startsAt),
                          startTime: toTimeInput(row.startsAt),
                          endDate: row.endsAt ? toDateInput(row.endsAt) : '',
                          endTime: row.endsAt ? toTimeInput(row.endsAt) : '',
                          location: row.location ?? '',
                          category: row.category,
                          status: row.status,
                          contactName: row.contactName ?? '',
                          contactEmail: row.contactEmail ?? '',
                          contactPhone: row.contactPhone ?? '',
                          ticketUrl: row.ticketUrl ?? '',
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
                      <DeleteEventButton id={row.id} title={row.title} />
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
    <span className="inline-flex items-center gap-1 rounded-full border border-progress-border bg-progress-soft px-1.5 py-0.5 text-[11px] font-medium text-progress">
      <Inbox className="size-3" />
      Submitted
    </span>
  )
}

function ContactLine({
  name,
  email,
  phone,
}: {
  name: string | null
  email: string | null
  phone: string | null
}) {
  if (!name && !email && !phone) return null

  return (
    <div className="flex flex-col gap-0.5 text-sm">
      {name ? <span className="font-medium">{name}</span> : null}
      {email ? (
        <a
          href={`mailto:${email}`}
          className="inline-flex items-center gap-1 break-words text-steel hover:underline"
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
