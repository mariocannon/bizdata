import Link from 'next/link'
import {
  AlertTriangle,
  ExternalLink,
  Inbox,
  Mail,
  MapPin,
  Phone,
  Star,
} from 'lucide-react'
import { prisma } from '@/lib/db'
import {
  CLASSIFIED_SOURCES,
  JOB_CATEGORIES,
  JOB_STATUSES,
  JOB_TIERS,
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
  JOB_WORD_MAX,
  displayTown,
  isFeeOutstanding,
  jobMeta,
  jobPaymentUrl,
  jobsOwing,
  requiresWordCount,
} from '@/lib/jobs'
import type { JobTier } from '@/lib/enums'
import { cn, formatDate, formatMoney } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { FilterBar } from '@/components/filter-bar'
import { ViewToggle } from '@/components/view-toggle'
import { SortHeader } from '@/components/sort-header'
import { StatusPill } from '@/components/status-pill'
import { ExportCsvButton } from '@/components/export-csv-button'
import { ExportBeehiivButton } from '@/components/export-beehiiv-button'
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
import { archivePastJobs } from './actions'
import { JobForm } from './job-form'
import { DeleteJobButton } from './delete-job-button'
import { PaymentLinkButton } from './payment-link-button'
import { ApproveJobButton } from './approve-job-button'
import { AssignIssueSelect } from './assign-issue-select'

export const dynamic = 'force-dynamic'

const CSV_COLUMNS = [
  { header: 'Role', key: 'title' },
  { header: 'Employer', key: 'employer' },
  { header: 'Copy', key: 'body' },
  { header: 'Words', key: 'words' },
  { header: 'Category', key: 'category' },
  { header: 'Job type', key: 'jobType' },
  { header: 'Town', key: 'town' },
  { header: 'Pay', key: 'pay' },
  { header: 'Apply URL', key: 'applyUrl' },
  { header: 'Tier', key: 'tier' },
  { header: 'Price', key: 'price' },
  { header: 'Fee paid', key: 'paid' },
  { header: 'Status', key: 'status' },
  { header: 'Source', key: 'source' },
  { header: 'Issue', key: 'issue' },
  { header: 'Closes', key: 'closesAt' },
  { header: 'Logo URL', key: 'logoUrl' },
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
  tier?: string
  source?: string
  fee?: string
  issueId?: string
  sort?: string
  dir?: string
}

export default async function JobsPage({ searchParams }: { searchParams: SearchParams }) {
  const view = searchParams.view === 'copy' ? 'copy' : 'table'
  const query = searchParams.q?.trim().toLowerCase() ?? ''
  const statusFilter = searchParams.status ?? ''
  const categoryFilter = searchParams.category ?? ''
  const tierFilter = searchParams.tier ?? ''
  const sourceFilter = searchParams.source ?? ''
  const feeFilter = searchParams.fee ?? ''
  const issueFilter = searchParams.issueId ?? ''
  // A jobs list is read by closing date — what drops off next is what matters.
  const sort = searchParams.sort ?? 'closes'
  const dir = searchParams.dir === 'desc' ? 'desc' : 'asc'

  // A listing whose run is over retires itself before the list is read — the
  // same backstop the events page runs. thetidelanding's build already filters
  // closed listings off the public page regardless.
  await archivePastJobs()

  const [jobs, issues] = await Promise.all([
    prisma.job.findMany({ include: { issue: true }, orderBy: { closesAt: 'asc' } }),
    prisma.issue.findMany({
      orderBy: { publishDate: 'asc' },
      select: { id: true, title: true, publishDate: true },
    }),
  ])

  const now = new Date()

  const rows = jobs
    .map((job) => {
      const words = countWords(job.body)
      return {
        ...job,
        words,
        state: wordCountState(words),
        meta: jobMeta(job),
        closed: job.closesAt < now,
        tooLong: requiresWordCount(job.status) && !isWordCountValid(words),
        feeOutstanding: isFeeOutstanding(job.paid),
      }
    })
    .filter((row) => {
      if (
        query &&
        !`${row.title} ${row.employer} ${row.body} ${row.contactName ?? ''} ${row.contactEmail ?? ''}`
          .toLowerCase()
          .includes(query)
      ) {
        return false
      }
      if (statusFilter && row.status !== statusFilter) return false
      if (categoryFilter && row.category !== categoryFilter) return false
      if (tierFilter && row.tier !== tierFilter) return false
      if (sourceFilter && row.source !== sourceFilter) return false
      // The fee sold but not yet collected — the chase list.
      if (feeFilter === 'owing' && !row.feeOutstanding) return false
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
      case 'employer':
        return a.employer.localeCompare(b.employer) * factor
      case 'category':
        return a.category.localeCompare(b.category) * factor
      case 'tier':
        return (
          (JOB_TIERS.indexOf(a.tier as never) - JOB_TIERS.indexOf(b.tier as never)) * factor
        )
      case 'status':
        return (
          (JOB_STATUSES.indexOf(a.status as never) -
            JOB_STATUSES.indexOf(b.status as never)) *
          factor
        )
      case 'words':
        return (a.words - b.words) * factor
      case 'issue': {
        // Unassigned listings sort last in either direction — they are the
        // queue, not part of a running order.
        const left = a.issue?.publishDate.getTime() ?? Infinity
        const right = b.issue?.publishDate.getTime() ?? Infinity
        if (left === Infinity || right === Infinity)
          return left === right ? 0 : left === Infinity ? 1 : -1
        return (left - right) * factor
      }
      default:
        return (a.closesAt.getTime() - b.closesAt.getTime()) * factor
    }
  })

  const csvRows = rows.map((row) => ({
    title: row.title,
    employer: row.employer,
    body: row.body,
    words: row.words,
    category: label(row.category),
    jobType: label(row.jobType),
    town: displayTown(row.town),
    pay: row.pay ?? '',
    applyUrl: row.applyUrl ?? '',
    tier: label(row.tier),
    price: row.price.toFixed(2),
    paid: label(row.paid),
    status: label(row.status),
    source: label(row.source),
    issue: row.issue?.title ?? '',
    closesAt: row.closesAt.toISOString().slice(0, 10),
    logoUrl: row.logoUrl ?? '',
    contactName: row.contactName ?? '',
    contactEmail: row.contactEmail ?? '',
    contactPhone: row.contactPhone ?? '',
    notes: row.notes ?? '',
  }))

  // What goes into the newsletter: published listings, from whatever the page
  // is filtered to. Featured first (the beehiiv renderer floats them up), then
  // by closing date — the next role to close reads first.
  const publishedListings = rows
    .filter((row) => row.status === 'PUBLISHED')
    .sort((a, b) => a.closesAt.getTime() - b.closesAt.getTime())
    .map((row) => ({
      headline: row.title,
      body: row.body,
      category: label(row.category),
      meta: jobMeta(row),
      // "Apply online" becomes the More info button under the copy.
      url: row.applyUrl,
      // Only a featured listing carries its logo into the newsletter, and only
      // a featured listing leads the block.
      imageUrl: row.tier === 'FEATURED' ? row.logoUrl : null,
      featured: row.tier === 'FEATURED',
      contactName: row.contactName,
      contactEmail: row.contactEmail,
      contactPhone: row.contactPhone,
    }))

  const approvedInView = rows.filter((row) => row.status === 'APPROVED').length

  const filteredIssue =
    issueFilter && issueFilter !== 'unassigned'
      ? issues.find((issue) => issue.id === issueFilter)
      : undefined

  const issueOptions = issues.map((issue) => ({ id: issue.id, title: issue.title }))
  const needsWork = rows.filter((row) => row.tooLong).length
  // Anything sent in through the site form and not yet looked at.
  const awaitingReview = jobs.filter(
    (row) => row.source === 'PUBLIC' && row.status === 'DRAFT'
  ).length
  // Fees owed across every listing rather than the filtered view — money owed
  // doesn't stop being owed because of a filter.
  const owing = jobsOwing(jobs)
  const featuredCount = jobs.filter((job) => job.tier === 'FEATURED').length

  return (
    <>
      <PageHeader
        title="Jobs"
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="tabular">
              {rows.length} of {jobs.length} listings
            </span>
            <span>
              Up to {JOB_WORD_MAX} words, an employer and a way to reply
            </span>
            {awaitingReview > 0 ? (
              <Link
                href="/jobs?source=PUBLIC&status=DRAFT"
                className="font-medium text-steel hover:underline"
              >
                {awaitingReview} submitted, awaiting review
              </Link>
            ) : null}
            {featuredCount > 0 ? (
              <Link
                href="/jobs?tier=FEATURED"
                className="inline-flex items-center gap-1 font-medium text-steel hover:underline"
              >
                <Star className="size-3.5" />
                {featuredCount} featured
              </Link>
            ) : null}
            {owing > 0 ? (
              <Link
                href="/jobs?fee=owing"
                className="tabular font-medium text-attention hover:underline"
              >
                {formatMoney(owing, true)} to collect
              </Link>
            ) : null}
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
              <a
                href="https://thetide.co.nz/hibiscus-coast-jobs/post"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink />
                Public form
              </a>
            </Button>
            <ExportBeehiivButton
              listings={publishedListings}
              approvedCount={approvedInView}
              subtitle={filteredIssue?.title}
              title="Jobs"
              filenameBase="the-tide-jobs"
              groupByCategory={false}
              noun="listing"
            />
            <ExportCsvButton
              rows={csvRows}
              columns={CSV_COLUMNS}
              filename="the-tide-jobs"
            />
            <JobForm issues={issueOptions} />
          </>
        }
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <FilterBar
            search={{ param: 'q', placeholder: 'Search jobs…' }}
            filters={[
              {
                param: 'status',
                label: 'Status',
                options: JOB_STATUSES.map((value) => ({ value, label: label(value) })),
              },
              {
                param: 'category',
                label: 'Category',
                options: JOB_CATEGORIES.map((value) => ({ value, label: label(value) })),
              },
              {
                param: 'tier',
                label: 'Tier',
                allLabel: 'All tiers',
                options: JOB_TIERS.map((value) => ({ value, label: label(value) })),
              },
              {
                param: 'fee',
                label: 'Fee',
                allLabel: 'All listings',
                options: [{ value: 'owing', label: 'Fee to collect' }],
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
          title="No listings match"
          description={
            jobs.length === 0
              ? `Add the first role — a title, an employer, up to ${JOB_WORD_MAX} words and a way for applicants to reply.`
              : 'Try clearing the filters or the search term.'
          }
          action={jobs.length === 0 ? <JobForm issues={issueOptions} /> : null}
        />
      ) : view === 'copy' ? (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {row.title}
                    {row.tier === 'FEATURED' ? <FeaturedChip /> : null}
                  </CardTitle>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-medium text-steel">
                    <MapPin className="size-3.5 shrink-0" />
                    {row.meta}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {label(row.category)} · Closes {formatDate(row.closesAt)} ·{' '}
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
                  <span
                    className={cn(
                      'tabular whitespace-nowrap text-xs font-medium',
                      row.feeOutstanding ? 'text-attention' : 'text-success'
                    )}
                  >
                    {formatMoney(row.price, true)} {label(row.paid).toLowerCase()}
                  </span>
                  {row.feeOutstanding ? (
                    <PaymentLinkButton
                      url={jobPaymentUrl(row.tier as JobTier, row.id)}
                      title={row.title}
                    />
                  ) : null}
                  <StatusPill value={row.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {row.tier === 'FEATURED' && row.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={row.logoUrl}
                    alt={`${row.employer} — logo`}
                    className="max-h-24 w-auto rounded border border-border bg-muted object-contain"
                  />
                ) : null}
                <p className="whitespace-pre-wrap">{row.body}</p>
                {row.applyUrl ? (
                  <a
                    href={row.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 break-all text-steel hover:underline"
                  >
                    <ExternalLink className="size-3.5 shrink-0" />
                    {row.applyUrl}
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
                  <SortHeader column="title">Role</SortHeader>
                </TableHead>
                <TableHead>
                  <SortHeader column="category">Category</SortHeader>
                </TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>
                  <SortHeader column="tier">Tier / fee</SortHeader>
                </TableHead>
                <TableHead>
                  <SortHeader column="closes">Closes</SortHeader>
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
                <TableRow key={row.id} className={cn(row.closed && 'opacity-60')}>
                  <TableCell className="max-w-[20rem]">
                    <p className="flex items-center gap-1.5 font-medium" title={row.title}>
                      {row.tier === 'FEATURED' ? (
                        <Star
                          aria-label="Featured"
                          className="size-3.5 shrink-0 text-steel"
                        />
                      ) : null}
                      <span className="truncate">{row.title}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground" title={row.meta}>
                      {row.meta}
                    </p>
                    <span className="flex flex-wrap items-center gap-1.5">
                      {row.source === 'PUBLIC' ? <SubmittedChip /> : null}
                      <span className="truncate text-xs text-muted-foreground">
                        {excerpt(row.body)}
                      </span>
                    </span>
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
                  <TableCell className="whitespace-nowrap">
                    <span className="block text-xs text-muted-foreground">
                      {label(row.tier)}
                    </span>
                    <span
                      className={cn(
                        'tabular text-xs font-medium',
                        row.feeOutstanding ? 'text-attention' : 'text-success'
                      )}
                    >
                      {formatMoney(row.price, true)} {label(row.paid).toLowerCase()}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    <span className="tabular">{formatDate(row.closesAt)}</span>
                    {row.closed ? (
                      <span className="block text-xs">Closed</span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <AssignIssueSelect
                      id={row.id}
                      issueId={row.issueId ?? ''}
                      issues={issueOptions}
                    />
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
                      {row.source === 'PUBLIC' && row.status === 'DRAFT' ? (
                        <ApproveJobButton id={row.id} title={row.title} />
                      ) : null}
                      {row.feeOutstanding ? (
                        <PaymentLinkButton
                          url={jobPaymentUrl(row.tier as JobTier, row.id)}
                          title={row.title}
                          compact
                        />
                      ) : null}
                      <JobForm
                        issues={issueOptions}
                        job={{
                          id: row.id,
                          title: row.title,
                          employer: row.employer,
                          body: row.body,
                          category: row.category,
                          jobType: row.jobType,
                          town: row.town,
                          pay: row.pay ?? '',
                          applyUrl: row.applyUrl ?? '',
                          status: row.status,
                          tier: row.tier,
                          paid: row.paid,
                          logoUrl: row.logoUrl ?? '',
                          closesAt: row.closesAt.toISOString().slice(0, 10),
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
                      <DeleteJobButton id={row.id} title={row.title} />
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

/** Marks a listing that came in through the site form rather than being typed in. */
function SubmittedChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-progress-border bg-progress-soft px-1.5 py-0.5 text-[11px] font-medium text-progress">
      <Inbox className="size-3" />
      Submitted
    </span>
  )
}

/** Marks the paid upgrade: this listing leads the block and carries a logo. */
function FeaturedChip() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-tide-200 bg-tide-100 px-1.5 py-0.5 text-[11px] font-medium text-tide-800">
      <Star className="size-3" />
      Featured
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
    return <span className="text-xs text-attention">No contact</span>
  }

  return (
    <div className={cn('flex flex-col gap-0.5', compact ? 'text-xs' : 'text-sm')}>
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
