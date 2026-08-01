import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { invoiceEligibility, paidStatusForInvoice } from './invoice-rules'
import type { BookingForInvoice } from './invoice-rules'

/** A booking that is ready to invoice; each test spoils one thing about it. */
function booking(overrides: Partial<BookingForInvoice> = {}): BookingForInvoice {
  return {
    price: 45000,
    status: 'RAN',
    paid: 'UNPAID',
    stripeInvoiceId: null,
    advertiser: { email: 'accounts@example.co.nz' },
    ...overrides,
  }
}

describe('invoiceEligibility', () => {
  it('allows a ran, unpaid, priced booking with an email', () => {
    assert.deepEqual(invoiceEligibility(booking()), { ok: true })
  })

  it('refuses a second invoice for the same booking', () => {
    const result = invoiceEligibility(booking({ stripeInvoiceId: 'in_123' }))
    assert.equal(result.ok, false)
    if (!result.ok) assert.match(result.reason, /already has a Stripe invoice/)
  })

  it('refuses bookings that have not run yet', () => {
    for (const status of ['RESERVED', 'CONFIRMED']) {
      const result = invoiceEligibility(booking({ status }))
      assert.equal(result.ok, false, `${status} should not be invoiceable`)
      if (!result.ok) assert.match(result.reason, /once the ad has run/)
    }
  })

  it('refuses cancelled bookings with a reason of their own', () => {
    const result = invoiceEligibility(booking({ status: 'CANCELLED' }))
    assert.equal(result.ok, false)
    if (!result.ok) assert.match(result.reason, /Cancelled/)
  })

  it('refuses a booking already marked paid', () => {
    const result = invoiceEligibility(booking({ paid: 'PAID' }))
    assert.equal(result.ok, false)
    if (!result.ok) assert.match(result.reason, /already marked paid/)
  })

  it('refuses a zero or negative price', () => {
    assert.equal(invoiceEligibility(booking({ price: 0 })).ok, false)
    assert.equal(invoiceEligibility(booking({ price: -100 })).ok, false)
  })

  it('refuses a fractional price, which cannot be an integer number of cents', () => {
    assert.equal(invoiceEligibility(booking({ price: 450.5 })).ok, false)
  })

  it('refuses an advertiser with no email, since Stripe needs one', () => {
    const result = invoiceEligibility(booking({ advertiser: { email: null } }))
    assert.equal(result.ok, false)
    if (!result.ok) assert.match(result.reason, /no email address/)
  })
})

describe('paidStatusForInvoice', () => {
  it('maps a paid invoice to PAID', () => {
    assert.equal(paidStatusForInvoice('paid'), 'PAID')
  })

  it('maps an outstanding invoice to INVOICED', () => {
    assert.equal(paidStatusForInvoice('open'), 'INVOICED')
    assert.equal(paidStatusForInvoice('draft'), 'INVOICED')
  })

  it('puts a voided or written-off invoice back on the chase list', () => {
    assert.equal(paidStatusForInvoice('void'), 'UNPAID')
    assert.equal(paidStatusForInvoice('uncollectible'), 'UNPAID')
  })

  it('falls back to UNPAID for a missing status rather than assuming payment', () => {
    assert.equal(paidStatusForInvoice(null), 'UNPAID')
  })
})
