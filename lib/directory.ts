import { label } from '@/lib/enums'

/**
 * The Hibiscus Coast business directory: a page in the Ad Manager
 * (app/(app)/directory) that owns the *listings* inside thetidelanding's
 * hand-kept category pages. Categories, towns and SEO copy stay hand-kept in
 * thetidelanding — this only ever writes rows to `DirectoryListing`, read
 * back out over PostgREST at thetidelanding's build time.
 *
 * Two invariants live here as pure functions, the same shape as
 * lib/inventory.ts's `checkCapacity`: given the rows already in a category
 * and the row being saved, decide what the write is allowed to do. The
 * server action (app/(app)/directory/actions.ts) is what actually reads and
 * writes the database, inside one transaction per save so neither invariant
 * can be violated by two requests landing between reads.
 */

/** Max listings a single category can hold. Enforced outright — an add or
 * edit that would exceed it is rejected, never silently truncated. */
export const DIRECTORY_LISTING_CAP = 10

export type DirectoryListingLike = {
  id?: string | null
  category: string
  featured?: boolean
}

/**
 * Whether saving `candidate` would push its category over the cap.
 * `existing` should already be every listing in that category — the
 * candidate's own id (when editing) is excluded from the count, so an edit
 * that leaves the category unchanged is never blocked by counting itself.
 */
export function checkDirectoryCapacity(
  existing: DirectoryListingLike[],
  candidate: { id?: string | null; category: string },
  cap = DIRECTORY_LISTING_CAP
): { ok: boolean; reason?: string } {
  const count = existing.filter(
    (listing) => listing.category === candidate.category && listing.id !== candidate.id
  ).length

  if (count >= cap) {
    return {
      ok: false,
      reason: `${label(candidate.category)} already has ${cap} listings, the most a category can hold. Remove one before adding another.`,
    }
  }

  return { ok: true }
}

/**
 * ids of every other listing in the same category that need `featured`
 * unset so at most one listing per category is ever featured. Only relevant
 * when `candidate` is itself being saved with featured=true — the caller is
 * expected to clear these ids and write the candidate in the same
 * transaction, so the invariant can never be left broken between the two
 * writes.
 */
export function othersToUnfeature(
  existing: DirectoryListingLike[],
  candidate: { id?: string | null; category: string }
): string[] {
  return existing
    .filter(
      (listing): listing is DirectoryListingLike & { id: string } =>
        Boolean(listing.id) &&
        listing.id !== candidate.id &&
        listing.category === candidate.category &&
        Boolean(listing.featured)
    )
    .map((listing) => listing.id)
}
