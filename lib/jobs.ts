import { label } from '@/lib/enums'
import type { JobTier } from '@/lib/enums'
import {
  countWords,
  isWordCountValid,
  wordCountError,
  wordCountMessage,
} from '@/lib/classifieds'

/**
 * "Hibiscus Coast Jobs" — a paid job listing (model Job). Column for column a
 * Job is a Classified with a hire on it, so the copy rules are shared with
 * lib/classifieds.ts: same 70-word cap, flagged on drafts and enforced on
 * approval. Everything here is about the two things a Classified doesn't have —
 * a price, and a date it drops off the board.
 */

export const JOB_WORD_MAX = 70

/** Statuses where the word cap is enforced rather than merely flagged. */
const ENFORCED_STATUSES = ['APPROVED', 'PUBLISHED']

export function requiresWordCount(status: string): boolean {
  return ENFORCED_STATUSES.includes(status)
}

/** Re-exported so the form's live counter and the schema share one implementation. */
export { countWords, isWordCountValid, wordCountMessage, wordCountError }

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

/**
 * The list price of each tier, GST-inclusive, in NZD. The only place these
 * live. `priceForTier()` reads them; the server action/route then snapshots
 * the result onto `Job.price`, so changing a number here prices new listings
 * without rewriting what anyone was already charged — the same discipline
 * lib/featured.ts uses for the featured fee.
 */
export const JOB_PRICES: Record<JobTier, number> = {
  STANDARD: 49,
  FEATURED: 89,
  COMMUNITY: 14.99,
}

/** Launch offer: a Standard listing is this, not JOB_PRICES.STANDARD, until the
 * window closes. Featured and Community are never discounted. */
export const LAUNCH_STANDARD_PRICE = 19.99

/**
 * When launch pricing ends — 28 Jan 2027, local Coast time (NZDT, +13). After
 * this instant a Standard listing is the full $49. Written as an explicit
 * offset so it doesn't drift with the server's zone.
 */
export const LAUNCH_ENDS = new Date('2027-01-28T00:00:00+13:00')

/** Whether launch pricing is still running. */
export function inLaunchWindow(now: Date = new Date()): boolean {
  return now < LAUNCH_ENDS
}

/**
 * What to charge for a tier right now. A Standard listing taken during the
 * launch window is LAUNCH_STANDARD_PRICE; everything else is the list price.
 */
export function priceForTier(tier: JobTier, now: Date = new Date()): number {
  if (tier === 'STANDARD' && inLaunchWindow(now)) return LAUNCH_STANDARD_PRICE
  return JOB_PRICES[tier]
}

/** A listing's fee is outstanding until it is marked paid — invoiced still counts. */
export function isFeeOutstanding(paid: string): boolean {
  return paid !== 'PAID'
}

/**
 * What a set of listings still owes, in dollars. Added in cents and divided
 * once at the end so three $19.99 fees come to $59.97 rather than floating
 * point's $59.970000000000005 — the same discipline lib/featured.ts uses.
 * Status is deliberately not consulted: a fee is owed from the moment the
 * listing is taken, draft or archived alike.
 */
export function jobsOwing(jobs: { price: number; paid: string }[]): number {
  let cents = 0
  for (const job of jobs) {
    if (isFeeOutstanding(job.paid)) cents += Math.round(job.price * 100)
  }
  return cents / 100
}

// ---------------------------------------------------------------------------
// Paying for a listing — Stripe Payment Links, one per tier
// ---------------------------------------------------------------------------

/**
 * The Stripe Payment Link each tier is paid through — a plain URL rather than
 * a Stripe integration, exactly as lib/featured.ts does it: nothing here holds
 * an API key, opens a webhook, or adds an unauthenticated write path. The trade
 * is that Stripe never tells us a payment happened — `paid` is still set by
 * hand off the Stripe dashboard.
 *
 * OPERATOR TO DO: create three fixed-amount Payment Links in Stripe — Standard
 * ($19.99 launch → $49), Featured ($89), Community ($14.99) — and paste each
 * URL in below, replacing the placeholder. The same three links are used on
 * thetidelanding's /hibiscus-coast-jobs/post pricing buttons, so set them once
 * and reuse. The amount is fixed at Stripe's end; JOB_PRICES / priceForTier and
 * these links have to be changed together.
 */
export const STRIPE_LINK_STANDARD = 'https://buy.stripe.com/REPLACE_WITH_STANDARD_LINK'
export const STRIPE_LINK_FEATURED = 'https://buy.stripe.com/REPLACE_WITH_FEATURED_LINK'
export const STRIPE_LINK_COMMUNITY = 'https://buy.stripe.com/REPLACE_WITH_COMMUNITY_LINK'

const STRIPE_LINK_BY_TIER: Record<JobTier, string> = {
  STANDARD: STRIPE_LINK_STANDARD,
  FEATURED: STRIPE_LINK_FEATURED,
  COMMUNITY: STRIPE_LINK_COMMUNITY,
}

/** Stripe accepts letters, digits, `-` and `_` here, up to 200 characters. */
const CLIENT_REFERENCE = /^[A-Za-z0-9_-]{1,200}$/

/**
 * Where to send an employer to pay for a listing. Passing the job's id tags the
 * payment with `client_reference_id`, which Stripe shows against it in the
 * dashboard, so a payment matches back to the listing it belongs to rather than
 * being guessed at. An id Stripe would reject is dropped rather than sent.
 */
export function jobPaymentUrl(tier: JobTier, jobId?: string | null): string {
  const base = STRIPE_LINK_BY_TIER[tier] ?? STRIPE_LINK_STANDARD
  if (!jobId || !CLIENT_REFERENCE.test(jobId)) return base
  return `${base}?client_reference_id=${jobId}`
}

// ---------------------------------------------------------------------------
// The 30-day run
// ---------------------------------------------------------------------------

export const JOB_RUN_DAYS = 30

/**
 * A listing runs for JOB_RUN_DAYS from the day it's taken. The public form
 * defaults `closesAt` to this; the operator can bring it forward (a role that
 * closes for applications sooner) but the form never sets it further out.
 */
export function defaultClosesAt(from: Date = new Date()): Date {
  const d = new Date(from)
  d.setDate(d.getDate() + JOB_RUN_DAYS)
  return d
}

/**
 * Whether a listing should be shown: published, and still inside its run.
 * thetidelanding's build query filters on the same two facts
 * (`status=eq.PUBLISHED` and `closesAt` in the future), and the newsletter
 * Jobs block only carries listings this is true for.
 */
export function isOpen(
  job: { status: string; closesAt: Date },
  now: Date = new Date()
): boolean {
  return job.status === 'PUBLISHED' && job.closesAt >= now
}

/**
 * Whether the automatic sweep should archive this listing: its run is over and
 * it isn't archived already. Mirrors lib/events.ts `shouldAutoArchive` — a
 * finished listing goes where a run classified goes, still there but out of the
 * way, whatever status it reached.
 */
export function shouldAutoArchive(
  job: { closesAt: Date; status: string },
  now: Date = new Date()
): boolean {
  if (job.status === 'ARCHIVED') return false
  return job.closesAt < now
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

/**
 * Reader-facing spelling of a town. DIRECTORY_TOWNS is stored ASCII-ish and is
 * already macronised for every town except Ōrewa, which the directory list
 * keeps as "Orewa" for its URL slug. The newsletter and the public page are
 * reader-facing copy (BRANDING.md place-names), so fix that one on the way out.
 */
export function displayTown(town: string): string {
  return town === 'Orewa' ? 'Ōrewa' : town
}

/**
 * The one line under a job title, for lists and the newsletter export:
 * `Coastline Coffee · Ōrewa · Casual · $24–$27/hr`. Pay is dropped when it
 * wasn't given.
 */
export function jobMeta(job: {
  employer: string
  town: string
  jobType: string
  pay?: string | null
}): string {
  const parts = [job.employer, displayTown(job.town), label(job.jobType)]
  if (job.pay && job.pay.trim() !== '') parts.push(job.pay.trim())
  return parts.join(' · ')
}
