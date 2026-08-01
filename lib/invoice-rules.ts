import type Stripe from 'stripe'
import type { PaidStatus } from '@/lib/enums'

/**
 * The rules about *when* a booking may be invoiced, and what a Stripe invoice
 * status means for the app's payment state.
 *
 * Kept apart from lib/invoicing.ts — which talks to Stripe and the database —
 * so the rules are pure and can be tested directly, the same split as
 * lib/inventory.ts. The `stripe` import here is type-only, so nothing from the
 * SDK is pulled in at runtime.
 */

/** What a booking needs to look like before it can be invoiced. */
export type BookingForInvoice = {
  price: number // cents
  status: string
  paid: string
  stripeInvoiceId: string | null
  advertiser: { email: string | null }
}

export type Eligibility = { ok: true } | { ok: false; reason: string }

/**
 * Deliberately strict about `RAN`: charging before the ad has gone out means
 * refunding if an issue slips, which is worse than invoicing a few days later.
 */
export function invoiceEligibility(booking: BookingForInvoice): Eligibility {
  if (booking.stripeInvoiceId) {
    return { ok: false, reason: 'This booking already has a Stripe invoice.' }
  }
  if (booking.status === 'CANCELLED') {
    return { ok: false, reason: 'Cancelled bookings cannot be invoiced.' }
  }
  if (booking.status !== 'RAN') {
    return {
      ok: false,
      reason: 'Invoice once the ad has run — mark the booking Ran first.',
    }
  }
  if (booking.paid === 'PAID') {
    return { ok: false, reason: 'This booking is already marked paid.' }
  }
  if (!Number.isInteger(booking.price) || booking.price <= 0) {
    return { ok: false, reason: 'Set a price above zero before invoicing.' }
  }
  if (!booking.advertiser.email) {
    return {
      ok: false,
      reason: 'This advertiser has no email address — Stripe needs one to invoice them.',
    }
  }
  return { ok: true }
}

/** Maps a Stripe invoice status onto the app's three payment states. */
export function paidStatusForInvoice(status: Stripe.Invoice.Status | null): PaidStatus {
  switch (status) {
    case 'paid':
      return 'PAID'
    case 'open':
    case 'draft':
      return 'INVOICED'
    // Voided or written off — the money is not coming, so it goes back to the
    // chase list rather than sitting as invoiced forever.
    case 'void':
    case 'uncollectible':
    default:
      return 'UNPAID'
  }
}
