import 'server-only'
import Stripe from 'stripe'

/**
 * The single seam between the app and Stripe.
 *
 * Like the storage seam in lib/upload.ts, Stripe is optional: with no
 * STRIPE_SECRET_KEY the app runs exactly as it did before, and the invoicing UI
 * says it isn't configured rather than erroring. That keeps a fresh clone
 * working with no external accounts.
 *
 * The secret key is only ever read here, and this module is server-only, so it
 * cannot reach a client bundle.
 */

const SECRET_KEY = process.env.STRIPE_SECRET_KEY
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

/** Currency to bill in. The app formats NZD, so that is the default. */
export const CURRENCY = (process.env.STRIPE_CURRENCY ?? 'nzd').toLowerCase()

/** Days an advertiser gets to pay before the invoice is past due. */
export const PAYMENT_TERMS_DAYS = Number(process.env.STRIPE_PAYMENT_TERMS_DAYS ?? 14)

let client: Stripe | null = null

export function stripeEnabled(): boolean {
  return Boolean(SECRET_KEY)
}

export function webhookSecret(): string | undefined {
  return WEBHOOK_SECRET
}

/** True when the configured key is a test-mode key, so the UI can say so. */
export function stripeTestMode(): boolean {
  return Boolean(SECRET_KEY?.startsWith('sk_test_') || SECRET_KEY?.startsWith('rk_test_'))
}

export class StripeNotConfiguredError extends Error {
  constructor() {
    super('Stripe is not configured. Set STRIPE_SECRET_KEY to raise invoices.')
  }
}

export function getStripe(): Stripe {
  if (!SECRET_KEY) throw new StripeNotConfiguredError()

  if (!client) {
    client = new Stripe(SECRET_KEY, {
      // No explicit apiVersion: the SDK pins one, and package-lock pins the
      // SDK, so the version is already deterministic. Hardcoding it here as
      // well just adds a second place to update on upgrade.
      appInfo: { name: 'The Tide — Ad Manager' },
      // Netlify functions are short-lived; fail fast rather than holding one
      // open for the default 80 seconds.
      timeout: 20_000,
      maxNetworkRetries: 2,
    })
  }

  return client
}

/**
 * Turns a Stripe error into something worth showing the operator. Stripe's
 * messages are generally written for developers, but the invalid-request and
 * card ones are clear enough to pass through; anything else gets a generic
 * line, and the detail goes to the log.
 */
export function stripeErrorMessage(error: unknown): string {
  if (error instanceof StripeNotConfiguredError) return error.message

  if (error instanceof Stripe.errors.StripeError) {
    switch (error.type) {
      case 'StripeAuthenticationError':
        return 'Stripe rejected the API key. Check STRIPE_SECRET_KEY.'
      case 'StripeConnectionError':
        return 'Could not reach Stripe. Try again in a moment.'
      case 'StripeRateLimitError':
        return 'Stripe is rate-limiting us. Try again in a moment.'
      case 'StripeInvalidRequestError':
      case 'StripeCardError':
        return error.message
      default:
        return 'Stripe could not complete that request.'
    }
  }

  return 'Something went wrong talking to Stripe.'
}

export { Stripe }
