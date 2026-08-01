import { NextResponse, type NextRequest } from 'next/server'
import { Stripe, getStripe, stripeEnabled, webhookSecret } from '@/lib/stripe'
import { applyInvoiceState } from '@/lib/invoicing'

/**
 * Stripe webhook receiver — the only route in the app that is not behind the
 * shared password (see the matcher in middleware.ts). Stripe cannot log in, so
 * the gate here is the signature on the request instead.
 *
 * Nothing in the request body is trusted before `constructEventAsync` verifies
 * it against STRIPE_WEBHOOK_SECRET. Without that check anyone who found this
 * URL could POST a fake `invoice.paid` and mark bookings as paid.
 */

// The signature is computed over the exact bytes Stripe sent, so the body has
// to be read raw — any parsing or re-serialising first would break it.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HANDLED = new Set<Stripe.Event.Type>([
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.payment_succeeded',
  'invoice.finalized',
  'invoice.voided',
  'invoice.marked_uncollectible',
  'invoice.sent',
])

export async function POST(request: NextRequest) {
  const secret = webhookSecret()

  if (!stripeEnabled() || !secret) {
    // Nothing can be verified, so nothing is processed. 500 rather than 200 so
    // Stripe retries once the deployment is configured properly.
    console.error('Stripe webhook received but STRIPE_WEBHOOK_SECRET is not set.')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const payload = await request.text()

  let event: Stripe.Event
  try {
    event = await getStripe().webhooks.constructEventAsync(payload, signature, secret)
  } catch (error) {
    // A bad signature is either a misconfigured secret or someone probing.
    // Either way the body is not to be trusted, and 400 stops Stripe retrying.
    console.error('Stripe webhook signature verification failed', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    if (HANDLED.has(event.type)) {
      const invoice = event.data.object as Stripe.Invoice
      const bookingId = await applyInvoiceState(invoice)

      if (!bookingId) {
        // An invoice raised outside this app, or for a booking since deleted.
        // Acknowledged so Stripe stops retrying something we can't act on.
        console.warn(`Stripe ${event.type} for invoice ${invoice.id} matched no booking.`)
      }
    }
  } catch (error) {
    // 500 asks Stripe to retry — the right answer for a database blip, since
    // the handler converges on the same state whenever it does succeed.
    console.error(`Stripe webhook ${event.type} failed`, error)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
