'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { eventSchema, fieldErrors } from '@/lib/validation'
import { actionError, actionOk, optional, text, type ActionResult } from '@/lib/actions'
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
    ...values
  } = parsed.data

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
  }

  try {
    const event = id
      ? await prisma.event.update({ where: { id }, data })
      : await prisma.event.create({ data })

    revalidateEvents()
    return actionOk({ id: event.id }, id ? 'Event updated.' : 'Event added.')
  } catch (error) {
    console.error('saveEvent failed', error)
    return actionError('Could not save the event. Please try again.')
  }
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  try {
    await prisma.event.delete({ where: { id } })
    revalidateEvents()
    return actionOk(undefined, 'Event deleted.')
  } catch (error) {
    console.error('deleteEvent failed', error)
    return actionError('Could not delete that event.')
  }
}
