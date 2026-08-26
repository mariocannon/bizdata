import Link from 'next/link'
import { ExternalLink, Inbox, Phone, Star } from 'lucide-react'
import { prisma } from '@/lib/db'
import { CLASSIFIED_SOURCES, DIRECTORY_CATEGORIES, DIRECTORY_LISTING_STATUSES, label } from '@/lib/enums'
import { DIRECTORY_LISTING_CAP } from '@/lib/directory'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { FilterBar } from '@/components/filter-bar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DirectoryListingForm } from './directory-listing-form'
import { DeleteDirectoryListingButton } from './delete-directory-listing-button'
import { ApproveDirectoryListingButton } from './approve-directory-listing-button'

export const dynamic = 'force-dynamic'

type SearchParams = {
  status?: string
  source?: string
}

export default async function DirectoryPage({ searchParams }: { searchParams: SearchParams }) {
  const statusFilter = searchParams.status ?? ''
  const sourceFilter = searchParams.source ?? ''
  const filtered = Boolean(statusFilter || sourceFilter)

  // Featured first within a category, matching how it has to lead the block
  // on thetidelanding's public page; alphabetical after that.
  const listings = await prisma.directoryListing.findMany({
    orderBy: [{ featured: 'desc' }, { name: 'asc' }],
  })

  // Only a PUBLISHED row holds one of a category's 10 live slots — the cap
  // badges below and the add/edit dialog's "n/10" picker both need to reflect
  // that, not the raw row count, now that a category can also be carrying a
  // queue of PENDING submissions that aren't live yet.
  const categoryCounts = DIRECTORY_CATEGORIES.reduce<Record<string, number>>(
    (counts, category) => {
      counts[category] = listings.filter(
        (listing) => listing.category === category && listing.status === 'PUBLISHED'
      ).length
      return counts
    },
    {}
  )

  const totalPublished = listings.filter((listing) => listing.status === 'PUBLISHED').length
  const categoriesInUse = DIRECTORY_CATEGORIES.filter(
    (category) => categoryCounts[category] > 0
  ).length
  const categoriesFull = DIRECTORY_CATEGORIES.filter(
    (category) => categoryCounts[category] >= DIRECTORY_LISTING_CAP
  ).length

  // Anything sent in through the public form and not yet looked at.
  const awaitingReview = listings.filter((listing) => listing.status === 'PENDING').length

  const filteredListings = listings.filter((listing) => {
    if (statusFilter && listing.status !== statusFilter) return false
    if (sourceFilter && listing.source !== sourceFilter) return false
    return true
  })

  // With a filter active, only show the categories it actually matched —
  // 19 mostly-empty cards to find the two categories with a pending
  // submission would defeat the point of the filter.
  const categoriesToShow = filtered
    ? DIRECTORY_CATEGORIES.filter((category) =>
        filteredListings.some((listing) => listing.category === category)
      )
    : DIRECTORY_CATEGORIES

  return (
    <>
      <PageHeader
        title="Business directory"
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="tabular">
              {totalPublished} live {totalPublished === 1 ? 'listing' : 'listings'} across{' '}
              {categoriesInUse} of {DIRECTORY_CATEGORIES.length} categories
            </span>
            {awaitingReview > 0 ? (
              <Link
                href="/directory?source=PUBLIC&status=PENDING"
                className="inline-flex items-center gap-1 font-medium text-steel hover:underline"
              >
                <Inbox className="size-3.5" />
                {awaitingReview} submitted, awaiting review
              </Link>
            ) : null}
            {categoriesFull > 0 ? (
              <span className="tabular font-medium text-attention">
                {categoriesFull} {categoriesFull === 1 ? 'category' : 'categories'} at the{' '}
                {DIRECTORY_LISTING_CAP}-listing cap
              </span>
            ) : null}
            <span>Feeds the Hibiscus Coast business directory on thetidelanding</span>
          </span>
        }
        actions={<DirectoryListingForm categoryCounts={categoryCounts} />}
      >
        <FilterBar
          filters={[
            {
              param: 'status',
              label: 'Status',
              options: DIRECTORY_LISTING_STATUSES.map((value) => ({
                value,
                label: label(value),
              })),
            },
            {
              param: 'source',
              label: 'Source',
              allLabel: 'Any source',
              options: CLASSIFIED_SOURCES.map((value) => ({ value, label: label(value) })),
            },
          ]}
        />
      </PageHeader>

      {categoriesToShow.length === 0 ? (
        <EmptyState
          title="No listings match"
          description="Try clearing the filters."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {categoriesToShow.map((category) => {
            const rows = filteredListings.filter((listing) => listing.category === category)
            const count = categoryCounts[category]
            const full = count >= DIRECTORY_LISTING_CAP

            return (
              <Card key={category} className="overflow-hidden">
                <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 border-b border-border bg-muted/30 py-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {label(category)}
                    <Badge variant={full ? 'warning' : 'neutral'} className="tabular">
                      {count}/{DIRECTORY_LISTING_CAP}
                    </Badge>
                  </CardTitle>
                  <DirectoryListingForm
                    categoryCounts={categoryCounts}
                    defaultCategory={category}
                    trigger={
                      <Button type="button" variant="ghost" size="sm">
                        Add listing
                      </Button>
                    }
                  />
                </CardHeader>

                <CardContent className="p-0">
                  {rows.length === 0 ? (
                    <EmptyState
                      className="rounded-none border-0 border-t-0 bg-transparent py-8"
                      title="No listings yet"
                      description="Add the first business for this category."
                    />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Business</TableHead>
                          <TableHead>Town</TableHead>
                          <TableHead>Blurb</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead className="w-32" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="max-w-[14rem]">
                              <p className="flex items-center gap-1.5 font-medium" title={row.name}>
                                {row.featured ? (
                                  <Star
                                    aria-label="Featured"
                                    className="size-3.5 shrink-0 text-steel"
                                  />
                                ) : null}
                                <span className="truncate">{row.name}</span>
                              </p>
                              {row.status === 'PENDING' ? (
                                <div className="mt-1 flex flex-col gap-0.5">
                                  <AwaitingReviewChip />
                                  <SubmitterContactLine
                                    name={row.contactName}
                                    email={row.contactEmail}
                                    phone={row.contactPhone}
                                  />
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground">
                              {row.town}
                            </TableCell>
                            <TableCell className="max-w-[24rem] text-sm text-muted-foreground">
                              <p className="line-clamp-2">{row.blurb}</p>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                              <div className="flex flex-col gap-0.5">
                                {row.phone ? (
                                  <span className="inline-flex items-center gap-1">
                                    <Phone className="size-3 shrink-0" />
                                    {row.phone}
                                  </span>
                                ) : null}
                                {row.url ? (
                                  <a
                                    href={row.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-steel hover:underline"
                                  >
                                    <ExternalLink className="size-3 shrink-0" />
                                    <span className="truncate">Website</span>
                                  </a>
                                ) : null}
                                {!row.phone && !row.url ? <span>—</span> : null}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                {row.status === 'PENDING' ? (
                                  <ApproveDirectoryListingButton id={row.id} name={row.name} />
                                ) : null}
                                <DirectoryListingForm
                                  categoryCounts={categoryCounts}
                                  listing={{
                                    id: row.id,
                                    name: row.name,
                                    category: row.category,
                                    town: row.town,
                                    blurb: row.blurb,
                                    phone: row.phone ?? '',
                                    url: row.url ?? '',
                                    featured: row.featured,
                                  }}
                                  trigger={
                                    <button
                                      type="button"
                                      className={cn(
                                        'rounded px-1.5 py-0.5 text-xs text-muted-foreground',
                                        'hover:bg-muted hover:text-foreground'
                                      )}
                                    >
                                      Edit
                                    </button>
                                  }
                                />
                                <DeleteDirectoryListingButton id={row.id} name={row.name} />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}

/** Marks a PENDING row — a public submission the operator hasn't reviewed. */
function AwaitingReviewChip() {
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full border border-progress-border bg-progress-soft px-1.5 py-0.5 text-[11px] font-medium text-progress">
      <Inbox className="size-3" />
      Awaiting review
    </span>
  )
}

/** Who submitted a PENDING listing and how to reach them — never shown for a
 * staff-added row, which has no submitter to follow up with. */
function SubmitterContactLine({
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
    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
      {name ? <span>{name}</span> : null}
      {email ? (
        <a href={`mailto:${email}`} className="text-steel hover:underline">
          {email}
        </a>
      ) : null}
      {phone ? <span>{phone}</span> : null}
    </span>
  )
}
