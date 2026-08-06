import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { fieldErrors, publicEventSchema } from '@/lib/validation'
import { check, clientIp } from '@/lib/rate-limit'
import { parseDateTimeInput } from '@/lib/utils'

/**
 * The public event form's endpoint — the sibling of
 * /api/classifieds/submit, and defended the same way.
 *
 * A route handler rather than a server action, on purpose: actions are
 * dispatched by an ID in a header, not by the route they were posted to, so an
 * unauthenticated route that accepts them is a doorway to every action in the
 * app. `middleware.ts` refuses action posts on public paths.
 *
 * Everything it writes is an unassigned DRAFT tagged source=PUBLIC. Nothing
 * reaches a reader until the operator approves it.
 */

export const dynamic = 'force-dynamic'

const LIMIT = 5
const WINDOW_MS = 10 * 60 * 1000
const MAX_BYTES = 16 * 1024
const MIN_SECONDS = 3

function bad(message: string, errors?: Record<string, string>, status = 400) {
  return NextResponse.json({ ok: false, message, errors }, { status })
}

export async function POST(request: NextRequest) {
  const limit = check(`event-submit:${clientIp(request.headers)}`, LIMIT, WINDOW_MS)
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, message: 'That is a lot of events at once. Try again shortly.' },
      { status: 429, headers: { 'retry-after': String(limit.retryAfter) } }
    )
  }

  const raw = await request.text()
  if (raw.length > MAX_BYTES) {
    return bad('That submission is too large.', undefined, 413)
  }

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return bad('Could not read that submission.')
  }

  if (typeof payload !== 'object' || payload === null) {
    return bad('Could not read that submission.')
  }

  const body = payload as Record<string, unknown>

  // Honeypot: hidden from people, irresistible to bots. Answer the way a
  // success does, so a script learns nothing from being refused.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return NextResponse.json({ ok: true, message: 'Thanks — your event is in.' })
  }

  const startedAt = Number(body.startedAt)
  if (Number.isFinite(startedAt) && (Date.now() - startedAt) / 1000 < MIN_SECONDS) {
    return bad('That was quick — give it another go.')
  }

  const parsed = publicEventSchema.safeParse({
    title: body.title,
    body: body.body,
    startDate: body.startDate,
    startTime: body.startTime,
    endDate: body.endDate,
    endTime: body.endTime,
    location: body.location,
    category: body.category,
    contactName: body.contactName,
    contactEmail: body.contactEmail,
    contactPhone: body.contactPhone,
    ticketUrl: body.ticketUrl,
  })

  if (!parsed.success) {
    return bad('Check the highlighted fields.', fieldErrors(parsed.error))
  }

  const {
    startDate,
    startTime,
    endDate,
    endTime,
    contactEmail,
    contactPhone,
    ticketUrl,
    ...values
  } = parsed.data

  try {
    await prisma.event.create({
      data: {
        ...values,
        startsAt: parseDateTimeInput(startDate, startTime),
        endsAt: endDate ? parseDateTimeInput(endDate, endTime) : null,
        contactEmail: contactEmail ?? null,
        contactPhone: contactPhone ?? null,
        ticketUrl: ticketUrl ?? null,
        // Not negotiable from outside: submissions are unassigned drafts.
        status: 'DRAFT',
        source: 'PUBLIC',
        issueId: null,
      },
    })

    return NextResponse.json({ ok: true, message: 'Thanks — your event is in.' })
  } catch (error) {
    console.error('public event submission failed', error)
    return NextResponse.json(
      { ok: false, message: 'Something went wrong saving that. Please try again.' },
      { status: 500 }
    )
  }
}

/** Anything but POST on a public endpoint is noise. */
export async function GET() {
  return NextResponse.json({ ok: false, message: 'Method not allowed' }, { status: 405 })
}
