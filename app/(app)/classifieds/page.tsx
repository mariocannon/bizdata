import Link from 'next/link'
import { AlertTriangle, ExternalLink, Inbox, Mail, Phone, Star } from 'lucide-react'
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
import {
  featuredClassifiedPaymentUrl,
  featuredOwing,
  isFeeOutstanding,
} from '@/lib/featured'
import { cn, formatDate, formatMoney } from '@/lib/utils'
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
import { ExportBeehiivButton } from '@/components/export-beehiiv-button'
import { ClassifiedForm } from './classified-form'
import { DeleteClassifiedButton } from './delete-classified-button'
import { PaymentLinkButton } from './payment-link-button'

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
  { header: 'Featured', key: 'featured' },
  { header: 'Fee', key: 'featuredFee' },
  { header: 'Fee paid', key: 'featuredPaid' },
  { header: 'Image URL', key: 'imageUrl' },
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
  featured?: string
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
  const featuredFilter = searchParams.featured ?? ''
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
      if (featuredFilter === 'featured' && !row.featured) return false
      // The upgrade sold but not yet collected — the chase list.
      if (featuredFilter === 'owing' && !(row.featured && isFeeOutstanding(row.featuredPaid)))
        return false
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
    featured: row.featured ? 'Yes' : 'No',
    // Blank rather than 0.00 on a plain listing — there is no fee to reconcile.
    featuredFee: row.featured ? row.featuredFee.toFixed(2) : '',
    featuredPaid: row.featured ? label(row.featuredPaid) : '',
    imageUrl: row.imageUrl ?? '',
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
      // Only a featured listing carries its image into the newsletter, and
      // only a featured listing leads the block.
      imageUrl: row.featured ? row.imageUrl : null,
      featured: row.featured,
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
  // The featured upgrade, across every listing rather than the filtered view —
  // money owed doesn't stop being owed because of a filter.
  const featuredCount = classifieds.filter((row) => row.featured).length
  const owing = featuredOwing(classifieds)

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
                className="font-medium text-steel hover:underline"
              >
                {awaitingReview} submitted, awaiting review
              </Link>
            ) : null}
            {featuredCount > 0 ? (
              <Link
                href="/classifieds?featured=featured"
                className="inline-flex items-center gap-1 font-medium text-steel hover:underline"
              >
                <Star className="size-3.5" />
                {featuredCount} featured
              </Link>
            ) : null}
            {owing > 0 ? (
              <Link
                href="/classifieds?featured=owing"
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
                param: 'featured',
                label: 'Featured',
                allLabel: 'All listings',
                options: [
                  { value: 'featured', label: 'Featured' },
                  { value: 'owing', label: 'Fee to collect' },
                ],
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
                  <CardTitle className="flex items-center gap-2 text-base">
                    {row.headline}
                    {row.featured ? <FeaturedChip /> : null}
                  </CardTitle>
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
                  {row.featured ? (
                    // The fee, and where it has got to — "$1.99 unpaid" says
                    // both at once, where a second pill next to the status
                    // would only read as a second status.
                    <span
                      className={cn(
                        'tabular whitespace-nowrap text-xs font-medium',
                        isFeeOutstanding(row.featuredPaid)
                          ? 'text-attention'
                          : 'text-success'
                      )}
                    >
                      {formatMoney(row.featuredFee, true)}{' '}
                      {label(row.featuredPaid).toLowerCase()}
                    </span>
                  ) : null}
                  {row.featured && isFeeOutstanding(row.featuredPaid) ? (
                    <PaymentLinkButton
                      url={featuredClassifiedPaymentUrl(row.id)}
                      headline={row.headline}
                    />
                  ) : null}
                  <StatusPill value={row.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {row.featured && row.imageUrl ? (
                  // The image the reader will see above the copy, shown the
                  // same way here. A plain <img> because an upload is an
                  // arbitrary remote URL, which next/image would need every
                  // host configured for.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={row.imageUrl}
                    alt={`${row.headline} — featured image`}
                    className="max-h-64 w-full rounded border border-border bg-muted object-contain"
                  />
                ) : null}
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
                    <p className="flex items-center gap-1.5 font-medium" title={row.headline}>
                      {row.featured ? (
                        <Star aria-label="Featured" className="size-3.5 shrink-0 text-steel" />
                      ) : null}
                      <span className="truncate">{row.headline}</span>
                    </p>
                    <span className="flex flex-wrap items-center gap-1.5">
                      {row.source === 'PUBLIC' ? <SubmittedChip /> : null}
                      {row.featured && isFeeOutstanding(row.featuredPaid) ? (
                        <span className="tabular text-[11px] font-medium text-attention">
                          {formatMoney(row.featuredFee, true)}{' '}
                          {label(row.featuredPaid).toLowerCase()}
                        </span>
                      ) : null}
                    </span>
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
                        className="ml-1 inline size-3 text-attention"
                      />
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <StatusPill value={row.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {row.featured && isFeeOutstanding(row.featuredPaid) ? (
                        <PaymentLinkButton
                          url={featuredClassifiedPaymentUrl(row.id)}
                          headline={row.headline}
                          compact
                        />
                      ) : null}
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
                          featured: row.featured,
                          imageUrl: row.imageUrl ?? '',
                          featuredPaid: row.featuredPaid,
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
    <span className="inline-flex items-center gap-1 rounded-full border border-progress-border bg-progress-soft px-1.5 py-0.5 text-[11px] font-medium text-progress">
      <Inbox className="size-3" />
      Submitted
    </span>
  )
}

/** Marks the paid upgrade: this listing runs with an image above its copy. */
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
