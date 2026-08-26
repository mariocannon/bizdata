'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { directoryListingSchema, fieldErrors } from '@/lib/validation'
import { checkDirectoryCapacity, DIRECTORY_LISTING_CAP, othersToUnfeature } from '@/lib/directory'
import { label } from '@/lib/enums'
import { actionError, actionOk, checkbox, optional, text, type ActionResult } from '@/lib/actions'

function revalidateDirectory() {
  revalidatePath('/directory')
}

/**
 * A capacity rejection surfaced as a typed error so the transaction below can
 * throw it from inside `prisma.$transaction` (which rolls the write back) and
 * have the catch block outside tell it apart from a genuine database failure.
 */
class DirectoryCapacityError extends Error {}

/**
 * Best-effort trigger of thetidelanding's Netlify build hook, so a listing
 * change goes live without the operator having to remember to redeploy the
 * public site by hand. Deliberately outside the database transaction and
 * never allowed to fail the save/delete it follows: a build hook is a nice-
 * to-have, and the row the operator just wrote is the thing that actually
 * matters. Netlify build hooks fire on a plain, bodyless POST.
 */
async function triggerDirectoryRebuild() {
  const hookUrl = process.env.THETIDELANDING_BUILD_HOOK_URL
  if (!hookUrl) return

  try {
    await fetch(hookUrl, { method: 'POST' })
  } catch (error) {
    console.error('thetidelanding build hook failed', error)
  }
}

export async function saveDirectoryListing(
  form: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = directoryListingSchema.safeParse({
    id: optional(form, 'id'),
    name: text(form, 'name'),
    category: text(form, 'category'),
    town: text(form, 'town'),
    blurb: text(form, 'blurb'),
    phone: text(form, 'phone'),
    url: text(form, 'url'),
    featured: checkbox(form, 'featured'),
  })

  if (!parsed.success) {
    return actionError('Check the highlighted fields.', fieldErrors(parsed.error))
  }

  const { id, phone, url, ...values } = parsed.data

  // Deliberately no `status` or `source` here: this form never sets either.
  // A create lands with the column defaults (PUBLISHED/STAFF, unchanged
  // operator experience), and leaving them out of an update means the write
  // below simply doesn't touch whatever the row already had — a PENDING
  // public submission stays PENDING until an operator explicitly approves it
  // (see approveDirectoryListing), even after the operator edits and saves it.
  const data = {
    ...values,
    phone: phone ?? null,
    url: url ?? null,
  }

  try {
    const listing = await prisma.$transaction(async (tx) => {
      // The status this row already has — a save never changes it, so it's
      // also the status the row will still have after this write. Only a row
      // that already is (or, on create, always will be) PUBLISHED can push a
      // category over its live cap; a still-PENDING submission holds no live
      // slot no matter what its blurb or category change to, so its own
      // edits skip the cap check entirely rather than being blocked by an
      // unrelated category that happens to already be full of published
      // listings.
      const existingStatus = id
        ? (await tx.directoryListing.findUnique({ where: { id }, select: { status: true } }))
            ?.status
        : undefined

      // Scoped to the target category only — everything the cap check and
      // the featured-uniqueness check need to know, and nothing more.
      const inCategory = await tx.directoryListing.findMany({
        where: { category: data.category },
        select: { id: true, category: true, featured: true, status: true },
      })

      if (!id || existingStatus === 'PUBLISHED') {
        const capacity = checkDirectoryCapacity(inCategory, { id, category: data.category })
        if (!capacity.ok) {
          throw new DirectoryCapacityError(capacity.reason)
        }
      }

      // Setting this listing featured atomically unsets every other featured
      // listing in the category, in the same transaction as the write below —
      // so two sequential saves can never leave two listings featured at once.
      if (data.featured) {
        const others = othersToUnfeature(inCategory, { id, category: data.category })
        if (others.length > 0) {
          await tx.directoryListing.updateMany({
            where: { id: { in: others } },
            data: { featured: false },
          })
        }
      }

      return id
        ? tx.directoryListing.update({ where: { id }, data })
        : tx.directoryListing.create({ data })
    })

    revalidateDirectory()
    await triggerDirectoryRebuild()
    return actionOk({ id: listing.id }, id ? 'Listing updated.' : 'Listing added.')
  } catch (error) {
    if (error instanceof DirectoryCapacityError) {
      return actionError(error.message, { category: error.message })
    }
    console.error('saveDirectoryListing failed', error)
    return actionError('Could not save that listing. Please try again.')
  }
}

/**
 * A full-category rejection at approval time, surfaced as a typed error the
 * same way DirectoryCapacityError is above — worded for the operator
 * deciding whether to approve, not for the add/edit form's category field.
 */
class DirectoryApprovalError extends Error {}

/**
 * Moves a PENDING public submission to PUBLISHED — the only way a directory
 * listing's status ever changes; saveDirectoryListing deliberately never
 * touches it (see the comment above). Re-runs the same PUBLISHED-only cap
 * check saveDirectoryListing does, scoped to the row's own category, inside
 * one transaction with the status write — so two operators (or two
 * near-simultaneous clicks) approving different PENDING rows into the same
 * nearly-full category can't both succeed and push it to 11, the same
 * protection saveDirectoryListing's create path already relies on.
 */
export async function approveDirectoryListing(id: string): Promise<ActionResult> {
  try {
    const approved = await prisma.$transaction(async (tx) => {
      const current = await tx.directoryListing.findUnique({
        where: { id },
        select: { id: true, category: true, status: true },
      })

      if (!current) {
        throw new DirectoryApprovalError('That listing no longer exists.')
      }

      // Already live — most likely a second click landing after the first
      // one committed but before the page re-rendered without the Approve
      // button. The end state the operator wants is already true, so this
      // is a no-op success, not an error.
      if (current.status !== 'PENDING') {
        return null
      }

      const inCategory = await tx.directoryListing.findMany({
        where: { category: current.category },
        select: { id: true, category: true, featured: true, status: true },
      })

      const capacity = checkDirectoryCapacity(inCategory, {
        id: current.id,
        category: current.category,
      })
      if (!capacity.ok) {
        throw new DirectoryApprovalError(
          `${label(current.category)} is full (${DIRECTORY_LISTING_CAP}/${DIRECTORY_LISTING_CAP}) — free up a slot before approving this one.`
        )
      }

      return tx.directoryListing.update({ where: { id }, data: { status: 'PUBLISHED' } })
    })

    if (!approved) {
      return actionOk(undefined, 'That listing is already published.')
    }

    revalidateDirectory()
    await triggerDirectoryRebuild()
    return actionOk(undefined, 'Listing approved.')
  } catch (error) {
    if (error instanceof DirectoryApprovalError) {
      return actionError(error.message)
    }
    console.error('approveDirectoryListing failed', error)
    return actionError('Could not approve that listing. Please try again.')
  }
}

export async function deleteDirectoryListing(id: string): Promise<ActionResult> {
  try {
    await prisma.directoryListing.delete({ where: { id } })
    revalidateDirectory()
    await triggerDirectoryRebuild()
    return actionOk(undefined, 'Listing deleted.')
  } catch (error) {
    console.error('deleteDirectoryListing failed', error)
    return actionError('Could not delete that listing.')
  }
}
