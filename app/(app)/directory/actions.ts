'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { directoryListingSchema, fieldErrors } from '@/lib/validation'
import { checkDirectoryCapacity, othersToUnfeature } from '@/lib/directory'
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

  const data = {
    ...values,
    phone: phone ?? null,
    url: url ?? null,
  }

  try {
    const listing = await prisma.$transaction(async (tx) => {
      // Scoped to the target category only — everything the cap check and
      // the featured-uniqueness check need to know, and nothing more.
      const inCategory = await tx.directoryListing.findMany({
        where: { category: data.category },
        select: { id: true, category: true, featured: true },
      })

      const capacity = checkDirectoryCapacity(inCategory, { id, category: data.category })
      if (!capacity.ok) {
        throw new DirectoryCapacityError(capacity.reason)
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
