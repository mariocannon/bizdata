'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { classifiedSchema, fieldErrors } from '@/lib/validation'
import {
  actionError,
  actionOk,
  checkbox,
  file,
  optional,
  text,
  type ActionResult,
} from '@/lib/actions'
import { UploadError, deleteFile, saveFile } from '@/lib/upload'
import { FEATURED_CLASSIFIED_FEE } from '@/lib/featured'

function revalidateClassifieds() {
  revalidatePath('/classifieds')
  revalidatePath('/issues')
}

export async function saveClassified(form: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = classifiedSchema.safeParse({
    id: optional(form, 'id'),
    headline: text(form, 'headline'),
    body: text(form, 'body'),
    category: text(form, 'category'),
    status: text(form, 'status'),
    contactName: text(form, 'contactName'),
    contactEmail: text(form, 'contactEmail'),
    contactPhone: text(form, 'contactPhone'),
    issueId: text(form, 'issueId'),
    notes: text(form, 'notes'),
    featured: checkbox(form, 'featured'),
    imageUrl: text(form, 'imageUrl'),
    featuredPaid: text(form, 'featuredPaid') || 'UNPAID',
  })

  if (!parsed.success) {
    return actionError('Check the highlighted fields.', fieldErrors(parsed.error))
  }

  const {
    id,
    contactName,
    contactEmail,
    contactPhone,
    issueId,
    notes,
    featured,
    imageUrl,
    featuredPaid,
    ...values
  } = parsed.data

  // What the row already holds: the stored image, so a replaced one can be
  // cleaned up afterwards, and the fee, so re-saving a featured listing never
  // reprices it.
  const previous = id
    ? await prisma.classified.findUnique({
        where: { id },
        select: { imageUrl: true, featuredFee: true },
      })
    : null

  const upload = file(form, 'image')
  // The hidden field carries whatever is already stored; a fresh upload
  // replaces it below.
  let image = featured ? (imageUrl ?? previous?.imageUrl ?? null) : null

  if (featured && !upload && !image) {
    const message = 'A featured listing needs an image.'
    return actionError(message, { image: message })
  }

  // Upload last, so a validation failure never leaves an orphaned file behind.
  // An image picked and then un-featured is simply never saved.
  if (upload && featured) {
    try {
      image = await saveFile(upload)
    } catch (error) {
      if (error instanceof UploadError) {
        return actionError(error.message, { image: error.message })
      }
      console.error('classified image upload failed', error)
      return actionError('Could not save that image. Please try again.')
    }
  }

  const data = {
    ...values,
    contactName: contactName ?? null,
    contactEmail: contactEmail ?? null,
    contactPhone: contactPhone ?? null,
    issueId: issueId ?? null,
    notes: notes ?? null,
    featured,
    imageUrl: image,
    // Charged once, at the price of the day. Un-featuring clears it — there is
    // nothing to invoice for a listing that isn't running an image.
    featuredFee: featured ? (previous?.featuredFee || FEATURED_CLASSIFIED_FEE) : 0,
    featuredPaid: featured ? featuredPaid : 'UNPAID',
  }

  try {
    const classified = id
      ? await prisma.classified.update({ where: { id }, data })
      : await prisma.classified.create({ data })

    // Replaced or dropped image — clean up the file the listing no longer
    // points at.
    if (previous?.imageUrl && previous.imageUrl !== image) {
      await deleteFile(previous.imageUrl)
    }

    revalidateClassifieds()
    return actionOk(
      { id: classified.id },
      id ? 'Classified updated.' : 'Classified added.'
    )
  } catch (error) {
    console.error('saveClassified failed', error)
    if (upload && image) await deleteFile(image)
    return actionError('Could not save the classified. Please try again.')
  }
}

export async function deleteClassified(id: string): Promise<ActionResult> {
  try {
    const classified = await prisma.classified.delete({ where: { id } })
    await deleteFile(classified.imageUrl)
    revalidateClassifieds()
    return actionOk(undefined, 'Classified deleted.')
  } catch (error) {
    console.error('deleteClassified failed', error)
    return actionError('Could not delete that classified.')
  }
}
