'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { jobSchema, fieldErrors } from '@/lib/validation'
import { actionError, actionOk, optional, text, type ActionResult } from '@/lib/actions'
import { defaultClosesAt, priceForTier, shouldAutoArchive } from '@/lib/jobs'
import type { JobTier } from '@/lib/enums'
import { parseDateInput, toDateInput } from '@/lib/utils'

function revalidateJobs() {
  revalidatePath('/jobs')
  revalidatePath('/issues')
}

/** A FEATURED listing can't go live without the employer logo the tier is sold on. */
const LIVE_STATUSES = ['APPROVED', 'PUBLISHED']

function featuredNeedsLogo(tier: string, status: string, logoUrl: string | null | undefined): boolean {
  return tier === 'FEATURED' && LIVE_STATUSES.includes(status) && !logoUrl
}

/**
 * Archive every listing whose run is over. The jobs page runs this before it
 * reads, so a finished listing retires itself the first time anyone looks at
 * the list after its close date — there is no scheduler on this deployment, and
 * thetidelanding's build query already filters closed listings out of the
 * public page regardless. Never throws: a failed sweep is not a reason to fail
 * the page it was about to render. Mirrors events' archivePastEvents.
 */
export async function archivePastJobs(): Promise<number> {
  const now = new Date()
  try {
    const candidates = await prisma.job.findMany({
      where: { status: { not: 'ARCHIVED' }, closesAt: { lt: now } },
      select: { id: true, closesAt: true, status: true },
    })

    const finished = candidates
      .filter((job) => shouldAutoArchive(job, now))
      .map((job) => job.id)

    if (finished.length === 0) return 0

    const { count } = await prisma.job.updateMany({
      where: { id: { in: finished } },
      data: { status: 'ARCHIVED' },
    })
    return count
  } catch (error) {
    console.error('archivePastJobs failed', error)
    return 0
  }
}

export async function saveJob(form: FormData): Promise<ActionResult<{ id: string }>> {
  // closesAt is required by the schema, but a blank one from the form defaults
  // to a 30-day run rather than bouncing back as an error (lib/jobs.ts).
  const closesAtInput = text(form, 'closesAt') || toDateInput(defaultClosesAt())

  const parsed = jobSchema.safeParse({
    id: optional(form, 'id'),
    title: text(form, 'title'),
    employer: text(form, 'employer'),
    body: text(form, 'body'),
    category: text(form, 'category'),
    jobType: text(form, 'jobType'),
    town: text(form, 'town'),
    pay: optional(form, 'pay'),
    applyUrl: optional(form, 'applyUrl'),
    status: text(form, 'status'),
    tier: text(form, 'tier'),
    paid: text(form, 'paid') || 'UNPAID',
    logoUrl: optional(form, 'logoUrl'),
    closesAt: closesAtInput,
    contactName: optional(form, 'contactName'),
    contactEmail: optional(form, 'contactEmail'),
    contactPhone: optional(form, 'contactPhone'),
    issueId: optional(form, 'issueId'),
    notes: optional(form, 'notes'),
  })

  if (!parsed.success) {
    return actionError('Check the highlighted fields.', fieldErrors(parsed.error))
  }

  const {
    id,
    pay,
    applyUrl,
    logoUrl,
    closesAt,
    contactName,
    contactEmail,
    contactPhone,
    issueId,
    notes,
    ...values
  } = parsed.data

  const logo = values.tier === 'FEATURED' ? (logoUrl ?? null) : null

  if (featuredNeedsLogo(values.tier, values.status, logo)) {
    const message = 'Add the employer logo before a featured listing goes live.'
    return actionError(message, { logoUrl: message })
  }

  // The fee this row already carries. Re-saving a listing never reprices it —
  // the same discipline lib/featured.ts uses — but changing the tier does, and
  // a row still sitting at $0 gets its snapshot now.
  const previous = id
    ? await prisma.job.findUnique({ where: { id }, select: { price: true, tier: true } })
    : null

  const price =
    !id || !previous
      ? priceForTier(values.tier as JobTier)
      : previous.tier !== values.tier || previous.price === 0
        ? priceForTier(values.tier as JobTier)
        : previous.price

  const data = {
    ...values,
    pay: pay ?? null,
    applyUrl: applyUrl ?? null,
    logoUrl: logo,
    price,
    closesAt: parseDateInput(closesAt),
    contactName: contactName ?? null,
    contactEmail: contactEmail ?? null,
    contactPhone: contactPhone ?? null,
    issueId: issueId ?? null,
    notes: notes ?? null,
  }

  try {
    const job = id
      ? await prisma.job.update({ where: { id }, data })
      : await prisma.job.create({ data })

    revalidateJobs()
    return actionOk({ id: job.id }, id ? 'Listing updated.' : 'Listing added.')
  } catch (error) {
    console.error('saveJob failed', error)
    return actionError('Could not save the listing. Please try again.')
  }
}

/**
 * Moves a listing from the queue to Approved: snapshots the tier price if the
 * row is still at $0, defaults a missing close date to a 30-day run, and holds
 * the line on a featured listing needing its logo first.
 */
export async function approveJob(id: string): Promise<ActionResult> {
  try {
    const job = await prisma.job.findUnique({ where: { id } })
    if (!job) return actionError('That listing no longer exists.')

    if (job.status !== 'DRAFT') {
      return actionOk(undefined, 'That listing has already been through review.')
    }

    if (featuredNeedsLogo(job.tier, 'APPROVED', job.logoUrl)) {
      return actionError('Add the employer logo before approving a featured listing.')
    }

    await prisma.job.update({
      where: { id },
      data: {
        status: 'APPROVED',
        price: job.price === 0 ? priceForTier(job.tier as JobTier) : job.price,
      },
    })

    revalidateJobs()
    return actionOk(undefined, 'Listing approved.')
  } catch (error) {
    console.error('approveJob failed', error)
    return actionError('Could not approve that listing. Please try again.')
  }
}

/** Slots a listing into an issue, or back into the queue when issueId is empty. */
export async function assignJobToIssue(id: string, issueId: string): Promise<ActionResult> {
  try {
    await prisma.job.update({
      where: { id },
      data: { issueId: issueId === '' ? null : issueId },
    })
    revalidateJobs()
    return actionOk(undefined, issueId === '' ? 'Listing returned to the queue.' : 'Listing placed in the issue.')
  } catch (error) {
    console.error('assignJobToIssue failed', error)
    return actionError('Could not place that listing. Please try again.')
  }
}

export async function deleteJob(id: string): Promise<ActionResult> {
  try {
    await prisma.job.delete({ where: { id } })
    revalidateJobs()
    return actionOk(undefined, 'Listing deleted.')
  } catch (error) {
    console.error('deleteJob failed', error)
    return actionError('Could not delete that listing.')
  }
}
