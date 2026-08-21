/**
 * The featured upgrade, which an event listing and a classified both carry: an
 * image above the copy, the top of the exported block, one flat fee.
 *
 * It lives in its own file because it belongs to neither table. Both listing
 * types price it here, snapshot it onto their own row, and chase it with the
 * same three payment states a booking uses — so "what does featuring cost" and
 * "what is still owed" have one answer in the codebase rather than two that
 * can drift.
 */

/**
 * What featuring an event costs, and what featuring a classified costs.
 *
 * The prices are separate because they are separate products to price — an
 * event listing is worth more at the top of What's On than a classified is at
 * the top of the classifieds — even though everything else about the upgrade
 * is identical. The arithmetic below stays shared: it never looks at either
 * number, only at what each row was actually charged.
 *
 * The only place the current prices live. Each is copied onto the row's
 * `featuredFee` when the upgrade is taken, so changing one here prices new
 * listings without touching what anyone has already been charged — and the
 * two move independently.
 */
export const FEATURED_EVENT_FEE = 4.99
export const FEATURED_CLASSIFIED_FEE = 1.99

/** A fee is outstanding until it is marked paid — invoiced still counts. */
export function isFeeOutstanding(featuredPaid: string): boolean {
  return featuredPaid !== 'PAID'
}

/** The fee fields every featured listing carries, whichever table it sits in. */
export type FeaturedMoney = {
  featured: boolean
  featuredFee: number
  featuredPaid: string
}

/** Booked / collected / outstanding for a set of listings, plus how many. */
export type FeaturedTotals = {
  /** Featured listings counted — a plain listing is not one. */
  count: number
  /** Everything charged, collected or not. */
  booked: number
  /** The fees marked Paid. */
  collected: number
  /** Still owed — Unpaid and Invoiced alike. */
  outstanding: number
}

export const ZERO_FEATURED_TOTALS: FeaturedTotals = {
  count: 0,
  booked: 0,
  collected: 0,
  outstanding: 0,
}

/**
 * What a set of listings is worth: charged, collected, still owed.
 *
 * Added in cents and divided once at the end, so three $1.99 fees come to $5.97
 * rather than to floating point's $5.970000000000001. Status is deliberately
 * not consulted — a fee is owed from the moment the upgrade is taken, whether
 * the listing is still a draft or was archived a month ago — which is the same
 * rule the classifieds and events pages chase money by.
 */
export function featuredTotals(rows: FeaturedMoney[]): FeaturedTotals {
  let count = 0
  // Cents throughout; dollars only on the way out.
  let booked = 0
  let collected = 0
  let outstanding = 0

  for (const row of rows) {
    if (!row.featured) continue
    const fee = Math.round(row.featuredFee * 100)
    count += 1
    booked += fee
    if (isFeeOutstanding(row.featuredPaid)) outstanding += fee
    else collected += fee
  }

  return {
    count,
    booked: booked / 100,
    collected: collected / 100,
    outstanding: outstanding / 100,
  }
}

/**
 * What the featured listings in a view still owe. Cents, so it adds up with
 * `formatMoney(total, true)` rather than being rounded on the way in.
 */
export function featuredOwing(rows: FeaturedMoney[]): number {
  return featuredTotals(rows).outstanding
}

/**
 * The date a fee counts against, so the dashboard can put it in a period.
 *
 * A placed listing earns on the day its issue goes out — the same date a
 * booking's revenue lands on, so one issue's money sits in one period. A
 * listing still in the queue has no issue date to use, so it counts from the
 * day it arrived rather than falling out of every period; picking an issue for
 * it later moves it, exactly as changing an issue's publish date moves the
 * bookings on it.
 */
export function featuredEarnedOn(listing: {
  createdAt: Date
  issue?: { publishDate: Date } | null
}): Date {
  return listing.issue?.publishDate ?? listing.createdAt
}

/**
 * The Stripe Payment Link the featured-classified fee is paid through.
 *
 * A payment *link* rather than a Stripe integration on purpose: it is a plain
 * URL, so nothing here holds an API key, opens a webhook, or adds a second
 * unauthenticated write path to the app. The trade is that Stripe never tells
 * us a payment happened — `featuredPaid` is still set by hand, off the Stripe
 * dashboard, exactly as it was before.
 *
 * The amount is fixed at Stripe's end, not here. FEATURED_CLASSIFIED_FEE and
 * this link have to be changed together — raising the fee above without
 * building a new link keeps charging the old price.
 */
const FEATURED_CLASSIFIED_PAYMENT_LINK =
  'https://buy.stripe.com/6oU14pdDt8nF2uoaX64gg04'

/** Stripe accepts letters, digits, `-` and `_` here, up to 200 characters. */
const CLIENT_REFERENCE = /^[A-Za-z0-9_-]{1,200}$/

/**
 * Where to send someone to pay for featuring their classified.
 *
 * Passing the listing's id tags the payment with `client_reference_id`, which
 * Stripe shows against it in the dashboard — so a payment can be matched back
 * to the listing it belongs to rather than guessed at from the amount and the
 * name. An id Stripe would reject is dropped rather than sent: an untagged
 * payment is a small nuisance, a broken checkout is a lost sale.
 */
export function featuredClassifiedPaymentUrl(classifiedId?: string | null): string {
  if (!classifiedId || !CLIENT_REFERENCE.test(classifiedId)) {
    return FEATURED_CLASSIFIED_PAYMENT_LINK
  }
  return `${FEATURED_CLASSIFIED_PAYMENT_LINK}?client_reference_id=${classifiedId}`
}
