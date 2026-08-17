'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { eventSchema, fieldErrors } from '@/lib/validation'
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
import { FEATURED_EVENT_FEE } from '@/lib/events'
import { parseDateTimeInput } from '@/lib/utils'

function revalidateEvents() {
  revalidatePath('/events')
  revalidatePath('/issues')
}

export async function saveEvent(form: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = eventSchema.safeParse({
    id: optional(form, 'id'),
    title: text(form, 'title'),
    body: text(form, 'body'),
    startDate: text(form, 'startDate'),
    startTime: text(form, 'startTime'),
    endDate: text(form, 'endDate'),
    endTime: text(form, 'endTime'),
    location: text(form, 'location'),
    category: text(form, 'category'),
    status: text(form, 'status'),
    contactName: text(form, 'contactName'),
    contactEmail: text(form, 'contactEmail'),
    contactPhone: text(form, 'contactPhone'),
    ticketUrl: text(form, 'ticketUrl'),
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
    startDate,
    startTime,
    endDate,
    endTime,
    location,
    contactName,
    contactEmail,
    contactPhone,
    ticketUrl,
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
    ? await prisma.event.findUnique({
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
      console.error('event image upload failed', error)
      return actionError('Could not save that image. Please try again.')
    }
  }

  const data = {
    ...values,
    // The date and time fields are separate so "no time" is expressible; they
    // become one instant here, with a blank time landing on midnight.
    startsAt: parseDateTimeInput(startDate, startTime),
    endsAt: endDate ? parseDateTimeInput(endDate, endTime) : null,
    location: location ?? null,
    contactName: contactName ?? null,
    contactEmail: contactEmail ?? null,
    contactPhone: contactPhone ?? null,
    ticketUrl: ticketUrl ?? null,
    issueId: issueId ?? null,
    notes: notes ?? null,
    featured,
    imageUrl: image,
    // Charged once, at the price of the day. Un-featuring clears it — there is
    // nothing to invoice for a listing that isn't running an image.
    featuredFee: featured ? (previous?.featuredFee || FEATURED_EVENT_FEE) : 0,
    featuredPaid: featured ? featuredPaid : 'UNPAID',
  }

  try {
    const event = id
      ? await prisma.event.update({ where: { id }, data })
      : await prisma.event.create({ data })

    // Replaced or dropped image — clean up the file the event no longer
    // points at.
    if (previous?.imageUrl && previous.imageUrl !== image) {
      await deleteFile(previous.imageUrl)
    }

    revalidateEvents()
    return actionOk({ id: event.id }, id ? 'Event updated.' : 'Event added.')
  } catch (error) {
    console.error('saveEvent failed', error)
    if (upload && image) await deleteFile(image)
    return actionError('Could not save the event. Please try again.')
  }
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  try {
    const event = await prisma.event.delete({ where: { id } })
    await deleteFile(event.imageUrl)
    revalidateEvents()
    return actionOk(undefined, 'Event deleted.')
  } catch (error) {
    console.error('deleteEvent failed', error)
    return actionError('Could not delete that event.')
  }
}
