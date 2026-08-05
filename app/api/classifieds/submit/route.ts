import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { fieldErrors, publicClassifiedSchema } from '@/lib/validation'
import { check, clientIp } from '@/lib/rate-limit'

/**
 * The one unauthenticated write path in the app, backing the public form at
 * /submit.
 *
 * A route handler rather than a server action, on purpose. Server actions are
 * dispatched by an ID in a header, not by the route they were posted to, so an
 * unauthenticated route that accepts them is a doorway to every action in the
 * app. This handler only ever runs the code below, and `middleware.ts` refuses
 * action posts on public paths.
 *
 * Everything it writes is an unassigned DRAFT tagged source=PUBLIC. Nothing
 * reaches a reader until the operator approves it, so the blast radius of a
 * bad submission is one row in a review queue.
 */

export const dynamic = 'force-dynamic'

/** Submissions per IP per window. Generous for a person, tedious for a script. */
const LIMIT = 5
const WINDOW_MS = 10 * 60 * 1000

/** Bodies are a headline and 70-odd words; anything near this is not that. */
const MAX_BYTES = 16 * 1024

/** A form filled in faster than this was not filled in by a person. */
const MIN_SECONDS = 3

function bad(message: string, errors?: Record<string, string>, status = 400) {
  return NextResponse.json({ ok: false, message, errors }, { status })
}

export async function POST(request: NextRequest) {
  const limit = check(`submit:${clientIp(request.headers)}`, LIMIT, WINDOW_MS)
  if (!limit.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: 'That is a lot of listings at once. Try again shortly.',
      },
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

  // Honeypot: a field hidden from people and irresistible to bots. Answer the
  // same way a success does, so a script learns nothing from being refused.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return NextResponse.json({ ok: true, message: 'Thanks — your listing is in.' })
  }

  // Time-on-page, from a timestamp the form stamps when it renders.
  const startedAt = Number(body.startedAt)
  if (Number.isFinite(startedAt) && (Date.now() - startedAt) / 1000 < MIN_SECONDS) {
    return bad('That was quick — give it another go.')
  }

  const parsed = publicClassifiedSchema.safeParse({
    headline: body.headline,
    body: body.body,
    category: body.category,
    contactName: body.contactName,
    contactEmail: body.contactEmail,
    contactPhone: body.contactPhone,
  })

  if (!parsed.success) {
    return bad('Check the highlighted fields.', fieldErrors(parsed.error))
  }

  const { contactEmail, contactPhone, ...values } = parsed.data

  try {
    await prisma.classified.create({
      data: {
        ...values,
        contactEmail: contactEmail ?? null,
        contactPhone: contactPhone ?? null,
        // Not negotiable from outside: submissions are unassigned drafts.
        status: 'DRAFT',
        source: 'PUBLIC',
        issueId: null,
      },
    })

    return NextResponse.json({ ok: true, message: 'Thanks — your listing is in.' })
  } catch (error) {
    console.error('public classified submission failed', error)
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
