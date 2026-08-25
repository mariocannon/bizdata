import { ExternalLink, Phone, Star } from 'lucide-react'
import { prisma } from '@/lib/db'
import { DIRECTORY_CATEGORIES, label } from '@/lib/enums'
import { DIRECTORY_LISTING_CAP } from '@/lib/directory'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
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

export const dynamic = 'force-dynamic'

export default async function DirectoryPage() {
  // Featured first within a category, matching how it has to lead the block
  // on thetidelanding's public page; alphabetical after that.
  const listings = await prisma.directoryListing.findMany({
    orderBy: [{ featured: 'desc' }, { name: 'asc' }],
  })

  const categoryCounts = DIRECTORY_CATEGORIES.reduce<Record<string, number>>(
    (counts, category) => {
      counts[category] = listings.filter((listing) => listing.category === category).length
      return counts
    },
    {}
  )

  const totalListings = listings.length
  const categoriesInUse = DIRECTORY_CATEGORIES.filter(
    (category) => categoryCounts[category] > 0
  ).length
  const categoriesFull = DIRECTORY_CATEGORIES.filter(
    (category) => categoryCounts[category] >= DIRECTORY_LISTING_CAP
  ).length

  return (
    <>
      <PageHeader
        title="Business directory"
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="tabular">
              {totalListings} {totalListings === 1 ? 'listing' : 'listings'} across{' '}
              {categoriesInUse} of {DIRECTORY_CATEGORIES.length} categories
            </span>
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
      />

      <div className="flex flex-col gap-6">
        {DIRECTORY_CATEGORIES.map((category) => {
          const rows = listings.filter((listing) => listing.category === category)
          const count = rows.length
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
                        <TableHead className="w-20" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="max-w-[12rem]">
                            <p className="flex items-center gap-1.5 font-medium" title={row.name}>
                              {row.featured ? (
                                <Star
                                  aria-label="Featured"
                                  className="size-3.5 shrink-0 text-steel"
                                />
                              ) : null}
                              <span className="truncate">{row.name}</span>
                            </p>
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
    </>
  )
}
