'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { classifiedSchema, fieldErrors } from '@/lib/validation'
import { actionError, actionOk, optional, text, type ActionResult } from '@/lib/actions'

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
  })

  if (!parsed.success) {
    return actionError('Check the highlighted fields.', fieldErrors(parsed.error))
  }

  const { id, contactName, contactEmail, contactPhone, issueId, notes, ...values } =
    parsed.data

  const data = {
    ...values,
    contactName: contactName ?? null,
    contactEmail: contactEmail ?? null,
    contactPhone: contactPhone ?? null,
    issueId: issueId ?? null,
    notes: notes ?? null,
  }

  try {
    const classified = id
      ? await prisma.classified.update({ where: { id }, data })
      : await prisma.classified.create({ data })

    revalidateClassifieds()
    return actionOk(
      { id: classified.id },
      id ? 'Classified updated.' : 'Classified added.'
    )
  } catch (error) {
    console.error('saveClassified failed', error)
    return actionError('Could not save the classified. Please try again.')
  }
}

export async function deleteClassified(id: string): Promise<ActionResult> {
  try {
    await prisma.classified.delete({ where: { id } })
    revalidateClassifieds()
    return actionOk(undefined, 'Classified deleted.')
  } catch (error) {
    console.error('deleteClassified failed', error)
    return actionError('Could not delete that classified.')
  }
}
