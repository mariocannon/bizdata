/**
 * Money is stored and passed around as an integer number of cents.
 *
 * Floats can't represent most decimal fractions exactly, so a dollars-as-float
 * column drifts the moment prices are summed, split across a package or
 * discounted by a percentage. Integer cents can't drift, and it's also the unit
 * Stripe's API takes, so the value sent to Stripe is the value stored rather
 * than a rounding of it.
 *
 * The boundary rules:
 *   - Anything a person types is dollars      → `dollarsToCents` on the way in.
 *   - Anything shown to a person is dollars   → `formatMoney` (lib/utils).
 *   - Everything in between — the database, arithmetic, Stripe — is cents.
 */

import { z } from 'zod'

/** Largest value we'll accept for a single booking: $1,000,000. */
export const MAX_CENTS = 100_000_000

export function centsToDollars(cents: number): number {
  return Math.round(cents) / 100
}

/**
 * Dollars → cents, rounded half-up to the nearest cent.
 *
 * `Math.round(x * 100)` alone is wrong for values whose float representation
 * sits just below the true decimal — 1.005 is stored as 1.00499999999999989,
 * so it would round down to 100 rather than 101. Going via the string form of
 * the scaled value corrects that without pulling in a decimal library.
 */
export function dollarsToCents(dollars: number): number {
  if (!Number.isFinite(dollars)) return 0
  const scaled = dollars * 100
  // toFixed() rounds the decimal representation, not the binary one.
  return Math.round(Number(scaled.toFixed(4)))
}

/** Dollars as typed into a form: '1,250.50' or '$1250.5' or ''. */
export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, '')
  if (cleaned === '') return 0
  if (!/^-?\d*\.?\d*$/.test(cleaned)) return null
  const dollars = Number(cleaned)
  if (!Number.isFinite(dollars)) return null
  return dollarsToCents(dollars)
}

/** Cents → the plain decimal string a form input should hold: 45000 → '450.00'. */
export function centsToInput(cents: number): string {
  return centsToDollars(cents).toFixed(2)
}

/**
 * Form field schema: accepts what a person types, yields integer cents.
 * Rejecting non-numeric text here rather than coercing it to 0 means a typo in
 * a price is reported, not silently charged as nothing.
 */
export const centsFromDollarsSchema = z
  .union([z.string(), z.number()])
  .transform((value, ctx) => {
    const cents =
      typeof value === 'number' ? dollarsToCents(value) : parseDollarsToCents(value)

    if (cents === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a price like 450 or 450.00' })
      return z.NEVER
    }
    if (cents < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Price cannot be negative' })
      return z.NEVER
    }
    if (cents > MAX_CENTS) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'That price looks too large' })
      return z.NEVER
    }
    return cents
  })

/** Integer cents already in canonical form (database reads, API payloads). */
export const centsSchema = z.number().int().min(0).max(MAX_CENTS)
