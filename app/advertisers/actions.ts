'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { advertiserSchema, advertiserStatusChangeSchema, fieldErrors } from '@/lib/validation'
import { actionError, actionOk, checkbox, optional, text, type ActionResult } from '@/lib/actions'
import { parseDateInput } from '@/lib/utils'

function readForm(form: FormData) {
  return {
    id: optional(form, 'id'),
    name: text(form, 'name'),
    category: text(form, 'category'),
    status: text(form, 'status'),
    contactName: text(form, 'contactName'),
    email: text(form, 'email'),
    phone: text(form, 'phone'),
    website: text(form, 'website'),
    reviewsChecked: checkbox(form, 'reviewsChecked'),
    lastContacted: text(form, 'lastContacted'),
    notes: text(form, 'notes'),
  }
}

function revalidateAdvertisers(id?: string) {
  revalidatePath('/advertisers')
  revalidatePath('/bookings')
  revalidatePath('/')
  if (id) revalidatePath(`/advertisers/${id}`)
}

export async function saveAdvertiser(form: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = advertiserSchema.safeParse(readForm(form))
  if (!parsed.success) {
    return actionError('Check the highlighted fields.', fieldErrors(parsed.error))
  }

  const { id, lastContacted, ...values } = parsed.data
  const data = {
    ...values,
    lastContacted: lastContacted ? parseDateInput(lastContacted) : null,
    contactName: values.contactName ?? null,
    email: values.email ?? null,
    phone: values.phone ?? null,
    website: values.website ?? null,
    notes: values.notes ?? null,
  }

  try {
    const advertiser = id
      ? await prisma.advertiser.update({ where: { id }, data })
      : await prisma.advertiser.create({ data })

    revalidateAdvertisers(advertiser.id)
    return actionOk(
      { id: advertiser.id },
      id ? `${advertiser.name} updated.` : `${advertiser.name} added.`
    )
  } catch (error) {
    console.error('saveAdvertiser failed', error)
    return actionError('Could not save the advertiser. Please try again.')
  }
}

/** Used by the pipeline board when a card is dragged to another column. */
export async function updateAdvertiserStatus(
  input: z.input<typeof advertiserStatusChangeSchema>
): Promise<ActionResult<{ id: string }>> {
  const parsed = advertiserStatusChangeSchema.safeParse(input)
  if (!parsed.success) return actionError('That status is not valid.')

  try {
    const advertiser = await prisma.advertiser.update({
      where: { id: parsed.data.id },
      data: { status: parsed.data.status },
    })
    revalidateAdvertisers(advertiser.id)
    return actionOk({ id: advertiser.id })
  } catch (error) {
    console.error('updateAdvertiserStatus failed', error)
    return actionError('Could not move that advertiser.')
  }
}

export async function deleteAdvertiser(id: string): Promise<ActionResult> {
  try {
    const bookings = await prisma.booking.count({ where: { advertiserId: id } })
    if (bookings > 0) {
      return actionError(
        `This advertiser has ${bookings} booking${bookings === 1 ? '' : 's'}. Delete or reassign them first.`
      )
    }

    await prisma.advertiser.delete({ where: { id } })
    revalidateAdvertisers()
    return actionOk(undefined, 'Advertiser deleted.')
  } catch (error) {
    console.error('deleteAdvertiser failed', error)
    return actionError('Could not delete that advertiser.')
  }
}
