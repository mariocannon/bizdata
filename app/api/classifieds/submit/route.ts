import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { fieldErrors, publicClassifiedSchema } from '@/lib/validation'
import { file, text } from '@/lib/actions'
import { check, clientIp } from '@/lib/rate-limit'
import { FEATURED_CLASSIFIED_FEE } from '@/lib/featured'
import { UploadError, deleteFile, saveFile } from '@/lib/upload'

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
 * The body is multipart rather than JSON, because a featured listing brings an
 * image with it. That is the only reason — every other field is still plain
 * text, and the size guards below keep a text-only submission as small as it
 * ever was.
 *
 * Everything it writes is an unassigned DRAFT tagged source=PUBLIC, and a
 * featured one lands UNPAID: asking for the upgrade is not paying for it.
 * Nothing reaches a reader until the operator approves it, so the blast radius
 * of a bad submission is one row in a review queue.
 */

export const dynamic = 'force-dynamic'

/** Submissions per IP per window. Generous for a person, tedious for a script. */
const LIMIT = 5
const WINDOW_MS = 10 * 60 * 1000

/** Bodies are a headline and 70-odd words; anything near this is not that. */
const MAX_TEXT_BYTES = 16 * 1024

/** With an image: the 5MB `lib/upload.ts` allows, plus multipart overhead. */
const MAX_BYTES = 6 * 1024 * 1024

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

  // Checked before the body is read, so an oversized one is refused rather
  // than buffered.
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_BYTES) {
    return bad('That submission is too large.', undefined, 413)
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return bad('Could not read that submission.')
  }

  // Honeypot: a field hidden from people and irresistible to bots. Answer the
  // same way a success does, so a script learns nothing from being refused.
  if (text(form, 'website') !== '') {
    return NextResponse.json({ ok: true, message: 'Thanks — your listing is in.' })
  }

  // Time-on-page, from a timestamp the form stamps when it renders.
  const startedAt = Number(text(form, 'startedAt'))
  if (Number.isFinite(startedAt) && (Date.now() - startedAt) / 1000 < MIN_SECONDS) {
    return bad('That was quick — give it another go.')
  }

  const featured = text(form, 'featured') === 'true'
  // Only a featured listing may carry one; anything else attached is ignored.
  const image = featured ? file(form, 'image') : null

  // Without an image there is nothing here but text, and text this big is not
  // a person filling in a form.
  if (!image && Number.isFinite(declared) && declared > MAX_TEXT_BYTES) {
    return bad('That submission is too large.', undefined, 413)
  }

  const parsed = publicClassifiedSchema.safeParse({
    headline: text(form, 'headline'),
    body: text(form, 'body'),
    category: text(form, 'category'),
    contactName: text(form, 'contactName'),
    contactEmail: text(form, 'contactEmail'),
    contactPhone: text(form, 'contactPhone'),
    featured,
  })

  if (!parsed.success) {
    return bad('Check the highlighted fields.', fieldErrors(parsed.error))
  }

  const { contactEmail, contactPhone, featured: wantsFeature, ...values } = parsed.data

  // Upload last, so a rejected submission never leaves a file behind.
  let imageUrl: string | null = null

  if (wantsFeature) {
    if (!image) {
      return bad('Add a photo to feature your listing.', {
        image: 'Add a photo, or untick featuring it',
      })
    }

    try {
      imageUrl = await saveFile(image)
    } catch (error) {
      if (error instanceof UploadError) return bad(error.message, { image: error.message })
      console.error('public classified image upload failed', error)
      return NextResponse.json(
        { ok: false, message: 'Something went wrong saving that photo. Please try again.' },
        { status: 500 }
      )
    }
  }

  try {
    await prisma.classified.create({
      data: {
        ...values,
        contactEmail: contactEmail ?? null,
        contactPhone: contactPhone ?? null,
        // Not negotiable from outside: submissions are unassigned drafts, and
        // the fee is what we charge today, not what the form says it is.
        status: 'DRAFT',
        source: 'PUBLIC',
        issueId: null,
        featured: wantsFeature,
        imageUrl,
        featuredFee: wantsFeature ? FEATURED_CLASSIFIED_FEE : 0,
        featuredPaid: 'UNPAID',
      },
    })

    return NextResponse.json({ ok: true, message: 'Thanks — your listing is in.' })
  } catch (error) {
    console.error('public classified submission failed', error)
    if (imageUrl) await deleteFile(imageUrl)
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
