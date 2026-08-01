'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { fieldErrors, issueSchema } from '@/lib/validation'
import { actionError, actionOk, optional, text, type ActionResult } from '@/lib/actions'
import { parseDateInput } from '@/lib/utils'

function revalidateIssues(id?: string) {
  revalidatePath('/issues')
  revalidatePath('/bookings')
  revalidatePath('/')
  if (id) revalidatePath(`/issues/${id}`)
}

export async function saveIssue(form: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = issueSchema.safeParse({
    id: optional(form, 'id'),
    title: text(form, 'title'),
    publishDate: text(form, 'publishDate'),
    status: text(form, 'status'),
    theme: text(form, 'theme'),
  })

  if (!parsed.success) {
    return actionError('Check the highlighted fields.', fieldErrors(parsed.error))
  }

  const { id, publishDate, theme, ...values } = parsed.data
  const data = {
    ...values,
    publishDate: parseDateInput(publishDate),
    theme: theme ?? null,
  }

  try {
    const issue = id
      ? await prisma.issue.update({ where: { id }, data })
      : await prisma.issue.create({ data })

    revalidateIssues(issue.id)
    return actionOk({ id: issue.id }, id ? 'Issue updated.' : 'Issue created.')
  } catch (error) {
    console.error('saveIssue failed', error)
    return actionError('Could not save the issue. Please try again.')
  }
}

export async function deleteIssue(id: string): Promise<ActionResult> {
  try {
    const bookings = await prisma.booking.count({ where: { issueId: id } })
    if (bookings > 0) {
      return actionError(
        `This issue has ${bookings} booking${bookings === 1 ? '' : 's'}. Move or delete them first.`
      )
    }

    await prisma.issue.delete({ where: { id } })
    revalidateIssues()
    return actionOk(undefined, 'Issue deleted.')
  } catch (error) {
    console.error('deleteIssue failed', error)
    return actionError('Could not delete that issue.')
  }
}
