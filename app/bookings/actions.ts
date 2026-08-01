'use server'

import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import { prisma } from '@/lib/db'
import { bookingSchema, fieldErrors } from '@/lib/validation'
import {
  actionError,
  actionOk,
  file,
  optional,
  text,
  type ActionResult,
} from '@/lib/actions'
import { UploadError, deleteFile, saveFile } from '@/lib/upload'
import { canConfirm, isCapacityEnforcedStatus, checkCapacity } from '@/lib/inventory'
import { getSettings } from '@/lib/settings'
import { label, type AdType, type SectionSlot } from '@/lib/enums'
import { paidStatusSchema } from '@/lib/enums'

function revalidateBookings(ids: { bookingId?: string; issueId?: string; advertiserId?: string }) {
  revalidatePath('/bookings')
  revalidatePath('/issues')
  revalidatePath('/advertisers')
  revalidatePath('/')
  if (ids.bookingId) revalidatePath(`/bookings/${ids.bookingId}`)
  if (ids.issueId) revalidatePath(`/issues/${ids.issueId}`)
  if (ids.advertiserId) revalidatePath(`/advertisers/${ids.advertiserId}`)
}

/** "Example Realty – Headline – 14 Aug" */
function buildLabel(
  advertiserName: string,
  adType: AdType,
  section: SectionSlot | null | undefined,
  publishDate: Date
): string {
  const type = section ? `${label(adType)} (${label(section)})` : label(adType)
  return `${advertiserName} – ${type} – ${format(publishDate, 'd MMM')}`
}

export type SaveBookingResult = { id: string; warning?: string }

export async function saveBooking(
  form: FormData
): Promise<ActionResult<SaveBookingResult>> {
  const parsed = bookingSchema.safeParse({
    id: optional(form, 'id'),
    label: text(form, 'label'),
    advertiserId: text(form, 'advertiserId'),
    issueId: text(form, 'issueId'),
    adType: text(form, 'adType'),
    section: text(form, 'section'),
    price: text(form, 'price') || '0',
    status: text(form, 'status'),
    paid: text(form, 'paid'),
    ctaUrl: text(form, 'ctaUrl'),
    copy: text(form, 'copy'),
    creativeUrl: text(form, 'creativeUrl'),
    notes: text(form, 'notes'),
  })

  if (!parsed.success) {
    return actionError('Check the highlighted fields.', fieldErrors(parsed.error))
  }

  const values = parsed.data
  // A Section Sponsor is the only ad type that carries a section.
  const section = values.adType === 'SECTION_SPONSOR' ? (values.section ?? null) : null

  const [advertiser, issue] = await Promise.all([
    prisma.advertiser.findUnique({ where: { id: values.advertiserId } }),
    prisma.issue.findUnique({ where: { id: values.issueId } }),
  ])

  if (!advertiser) return actionError('That advertiser no longer exists.', { advertiserId: 'Pick an advertiser' })
  if (!issue) return actionError('That issue no longer exists.', { issueId: 'Pick an issue' })

  // Inventory control. A confirmed (or already-run) booking must fit; a
  // reservation is allowed through but warns that the issue is now oversold.
  const draft = {
    id: values.id,
    adType: values.adType,
    section,
    status: values.status,
  }

  let warning: string | undefined

  if (values.status !== 'CANCELLED') {
    const check = await canConfirm(values.issueId, draft)

    if (!check.ok) {
      const reason = check.reason ?? 'That would oversell this issue.'

      if (isCapacityEnforcedStatus(values.status)) {
        return actionError(reason, { adType: reason })
      }
      warning = `${reason} Saved as a reservation — this issue is now flagged oversold.`
    }
  }

  // Upload last, so a validation failure never leaves an orphaned file behind.
  let creativeUrl = values.creativeUrl ?? null
  const upload = file(form, 'creative')

  if (upload) {
    try {
      creativeUrl = await saveFile(upload)
    } catch (error) {
      if (error instanceof UploadError) {
        return actionError(error.message, { creative: error.message })
      }
      console.error('creative upload failed', error)
      return actionError('Could not save that image. Please try again.')
    }
  }

  const data = {
    label:
      values.label ?? buildLabel(advertiser.name, values.adType, section, issue.publishDate),
    advertiserId: values.advertiserId,
    issueId: values.issueId,
    adType: values.adType,
    section,
    price: values.price,
    status: values.status,
    paid: values.paid,
    ctaUrl: values.ctaUrl ?? null,
    copy: values.copy ?? null,
    creativeUrl,
    notes: values.notes ?? null,
  }

  try {
    if (values.id) {
      const previous = await prisma.booking.findUnique({
        where: { id: values.id },
        select: { creativeUrl: true },
      })

      const booking = await prisma.booking.update({ where: { id: values.id }, data })

      // Replaced creative — clean up the file the booking no longer points at.
      if (upload && previous?.creativeUrl && previous.creativeUrl !== creativeUrl) {
        await deleteFile(previous.creativeUrl)
      }

      revalidateBookings({
        bookingId: booking.id,
        issueId: booking.issueId,
        advertiserId: booking.advertiserId,
      })
      return actionOk({ id: booking.id, warning }, 'Booking updated.')
    }

    const booking = await prisma.booking.create({ data })
    revalidateBookings({
      bookingId: booking.id,
      issueId: booking.issueId,
      advertiserId: booking.advertiserId,
    })
    return actionOk({ id: booking.id, warning }, 'Booking created.')
  } catch (error) {
    console.error('saveBooking failed', error)
    if (upload && creativeUrl) await deleteFile(creativeUrl)
    return actionError('Could not save the booking. Please try again.')
  }
}

export async function deleteBooking(id: string): Promise<ActionResult> {
  try {
    const booking = await prisma.booking.delete({ where: { id } })
    await deleteFile(booking.creativeUrl)
    revalidateBookings({
      issueId: booking.issueId,
      advertiserId: booking.advertiserId,
    })
    return actionOk(undefined, 'Booking deleted.')
  } catch (error) {
    console.error('deleteBooking failed', error)
    return actionError('Could not delete that booking.')
  }
}

/** Inline payment update from the chase list. */
export async function updateBookingPaid(
  id: string,
  paid: string
): Promise<ActionResult<{ id: string }>> {
  const parsed = paidStatusSchema.safeParse(paid)
  if (!parsed.success) return actionError('That payment status is not valid.')

  try {
    const booking = await prisma.booking.update({
      where: { id },
      data: { paid: parsed.data },
    })
    revalidateBookings({
      bookingId: booking.id,
      issueId: booking.issueId,
      advertiserId: booking.advertiserId,
    })
    return actionOk({ id: booking.id }, `Marked ${label(parsed.data).toLowerCase()}.`)
  } catch (error) {
    console.error('updateBookingPaid failed', error)
    return actionError('Could not update that booking.')
  }
}

/**
 * Live capacity preview for the booking form, so the operator sees the
 * conflict before pressing save.
 */
export async function previewCapacity(input: {
  id?: string
  issueId: string
  adType: string
  section?: string | null
}): Promise<{ ok: boolean; reason?: string }> {
  if (!input.issueId || !input.adType) return { ok: true }

  const [existing, settings] = await Promise.all([
    prisma.booking.findMany({
      where: { issueId: input.issueId, ...(input.id ? { NOT: { id: input.id } } : {}) },
      select: { id: true, adType: true, section: true, status: true },
    }),
    getSettings(),
  ])

  return checkCapacity(
    existing,
    {
      adType: input.adType as AdType,
      section: (input.section ?? null) as SectionSlot | null,
      status: 'CONFIRMED',
    },
    settings.bulletinCapacity
  )
}
