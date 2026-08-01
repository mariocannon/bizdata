import 'server-only'
import { prisma } from '@/lib/db'
import { CURRENCY, PAYMENT_TERMS_DAYS, Stripe, getStripe, stripeEnabled } from '@/lib/stripe'
import { invoiceEligibility, paidStatusForInvoice } from '@/lib/invoice-rules'

// Re-exported so callers have one import for invoicing, while the rules
// themselves stay in a module with no server-only or Stripe runtime import.
export { invoiceEligibility, paidStatusForInvoice }
export type { BookingForInvoice, Eligibility } from '@/lib/invoice-rules'

/**
 * Raising and reconciling Stripe invoices for bookings.
 *
 * The money model: an advertiser is one Stripe Customer, and each booking gets
 * at most one Stripe Invoice. `Booking.stripeInvoiceId` is unique in the
 * database, so the "one invoice per booking" rule is enforced by Postgres and
 * not only by the checks below.
 *
 * Invoices are raised **after the issue runs** — see `invoiceEligibility`.
 */

/** Something the operator did that Stripe was never asked about. */
export class InvoiceError extends Error {}

/**
 * Finds or creates the Stripe Customer for an advertiser.
 *
 * The stored id is verified before reuse: a key swapped from test to live mode
 * would otherwise keep pointing at a customer that doesn't exist in the new
 * mode, and every invoice would fail with a confusing "no such customer".
 */
async function ensureCustomer(advertiserId: string): Promise<string> {
  const stripe = getStripe()

  const advertiser = await prisma.advertiser.findUniqueOrThrow({
    where: { id: advertiserId },
  })

  if (advertiser.stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(advertiser.stripeCustomerId)
      if (!existing.deleted) return advertiser.stripeCustomerId
    } catch (error) {
      if (
        !(error instanceof Stripe.errors.StripeError) ||
        error.code !== 'resource_missing'
      ) {
        throw error
      }
      // Falls through and creates a fresh customer below.
      console.warn(
        `Stripe customer ${advertiser.stripeCustomerId} is missing; creating a new one.`
      )
    }
  }

  const customer = await stripe.customers.create(
    {
      name: advertiser.name,
      email: advertiser.email ?? undefined,
      phone: advertiser.phone ?? undefined,
      metadata: { advertiserId: advertiser.id },
    },
    // Retrying a failed create must not leave two customers for one advertiser.
    { idempotencyKey: `advertiser-customer-${advertiser.id}` }
  )

  await prisma.advertiser.update({
    where: { id: advertiser.id },
    data: { stripeCustomerId: customer.id },
  })

  return customer.id
}

export type RaisedInvoice = {
  invoiceId: string
  invoiceUrl: string | null
  invoicePdfUrl: string | null
  total: number
}

/**
 * Raises a finalised Stripe invoice for one booking and records it.
 *
 * Finalising (rather than leaving a draft) is what produces the hosted payment
 * page and the PDF. It does **not** email the advertiser — that is a separate,
 * explicit step in `emailInvoice`, so pressing "Raise invoice" never sends mail
 * to a real customer as a side effect.
 */
export async function createInvoiceForBooking(bookingId: string): Promise<RaisedInvoice> {
  const stripe = getStripe()

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { advertiser: true, issue: true },
  })

  const eligibility = invoiceEligibility(booking)
  if (!eligibility.ok) throw new InvoiceError(eligibility.reason)

  const customerId = await ensureCustomer(booking.advertiserId)

  // Create the invoice first, then attach the line item to it explicitly.
  // Creating items first and letting Stripe sweep up "pending" ones risks
  // pulling an unrelated item onto this invoice.
  const invoice = await stripe.invoices.create(
    {
      customer: customerId,
      collection_method: 'send_invoice',
      days_until_due: PAYMENT_TERMS_DAYS,
      description: `Advertising — ${booking.issue.title}`,
      metadata: { bookingId: booking.id, advertiserId: booking.advertiserId },
      auto_advance: false,
    },
    { idempotencyKey: `booking-invoice-${booking.id}` }
  )

  if (!invoice.id) throw new InvoiceError('Stripe returned an invoice with no id.')

  await stripe.invoiceItems.create(
    {
      customer: customerId,
      invoice: invoice.id,
      // Already integer cents — no conversion, so nothing to round.
      amount: booking.price,
      currency: CURRENCY,
      description: booking.label,
      metadata: { bookingId: booking.id },
    },
    { idempotencyKey: `booking-invoice-item-${booking.id}` }
  )

  const finalised = await stripe.invoices.finalizeInvoice(invoice.id)

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      stripeInvoiceId: finalised.id,
      invoiceUrl: finalised.hosted_invoice_url ?? null,
      invoicePdfUrl: finalised.invoice_pdf ?? null,
      invoicedAt: new Date(),
      paid: paidStatusForInvoice(finalised.status),
    },
  })

  return {
    invoiceId: finalised.id!,
    invoiceUrl: finalised.hosted_invoice_url ?? null,
    invoicePdfUrl: finalised.invoice_pdf ?? null,
    total: finalised.total ?? booking.price,
  }
}

/** Emails the finalised invoice to the advertiser through Stripe. */
export async function emailInvoice(bookingId: string): Promise<void> {
  const stripe = getStripe()

  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } })
  if (!booking.stripeInvoiceId) throw new InvoiceError('There is no invoice to send yet.')

  await stripe.invoices.sendInvoice(booking.stripeInvoiceId)
}

/**
 * Voids the invoice and detaches it from the booking, so a corrected one can be
 * raised. Stripe keeps the voided invoice for the record; the booking goes back
 * to unpaid and reappears on the chase list.
 */
export async function voidInvoiceForBooking(bookingId: string): Promise<void> {
  const stripe = getStripe()

  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } })
  if (!booking.stripeInvoiceId) throw new InvoiceError('There is no invoice to void.')
  if (booking.paid === 'PAID') {
    throw new InvoiceError('That invoice is paid — refund it in Stripe instead of voiding it.')
  }

  try {
    await stripe.invoices.voidInvoice(booking.stripeInvoiceId)
  } catch (error) {
    // Already void in Stripe: fall through and clear our side so the two agree.
    if (
      !(error instanceof Stripe.errors.StripeError) ||
      error.code !== 'invoice_not_editable'
    ) {
      throw error
    }
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      stripeInvoiceId: null,
      invoiceUrl: null,
      invoicePdfUrl: null,
      invoicedAt: null,
      paidAt: null,
      paid: 'UNPAID',
    },
  })
}

/** Invoice states that mean this invoice is still the booking's live one. */
const LIVE_INVOICE_STATUSES = new Set<Stripe.Invoice.Status>(['draft', 'open', 'paid'])

/**
 * Applies the state of a Stripe invoice to the booking it belongs to.
 *
 * Driven by the invoice's own `status` rather than by which event arrived, so
 * out-of-order or replayed webhooks converge on the same answer instead of
 * flip-flopping. Returns the booking id it touched, or null when there was
 * nothing to do.
 */
export async function applyInvoiceState(invoice: Stripe.Invoice): Promise<string | null> {
  if (!invoice.id) return null

  let booking = await prisma.booking.findUnique({
    where: { stripeInvoiceId: invoice.id },
  })

  // Not attached yet. Stripe fires `invoice.finalized` the moment we finalise,
  // which can beat our own write, so fall back to the id we put in metadata.
  if (!booking && invoice.metadata?.bookingId) {
    const candidate = await prisma.booking.findUnique({
      where: { id: invoice.metadata.bookingId },
    })

    // Only adopt the invoice if the booking is genuinely unattached and the
    // invoice is still live. Without this, a late `invoice.voided` for one we
    // already voided and detached would re-attach it and block re-invoicing.
    if (
      candidate &&
      !candidate.stripeInvoiceId &&
      invoice.status &&
      LIVE_INVOICE_STATUSES.has(invoice.status)
    ) {
      booking = candidate
    }
  }

  if (!booking) return null

  // Attached to a different invoice — this event is about an old one.
  if (booking.stripeInvoiceId && booking.stripeInvoiceId !== invoice.id) return null

  const paid = paidStatusForInvoice(invoice.status)
  const paidAtSeconds = invoice.status_transitions?.paid_at

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      paid,
      stripeInvoiceId: invoice.id,
      invoiceUrl: invoice.hosted_invoice_url ?? booking.invoiceUrl,
      invoicePdfUrl: invoice.invoice_pdf ?? booking.invoicePdfUrl,
      invoicedAt: booking.invoicedAt ?? new Date(),
      paidAt:
        paid === 'PAID'
          ? new Date((paidAtSeconds ?? Math.floor(Date.now() / 1000)) * 1000)
          : null,
    },
  })

  return booking.id
}

/** True when invoicing can be offered at all in this deployment. */
export function invoicingAvailable(): boolean {
  return stripeEnabled()
}
