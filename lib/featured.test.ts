import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  FEATURED_CLASSIFIED_FEE,
  FEATURED_EVENT_FEE,
  featuredClassifiedPaymentUrl,
  featuredEarnedOn,
  featuredOwing,
  featuredTotals,
  isFeeOutstanding,
} from './featured'

describe('the featured upgrade', () => {
  /** A row as either listing page holds it — only the fee fields matter here. */
  function row(featured: boolean, featuredFee: number, featuredPaid: string) {
    return { featured, featuredFee, featuredPaid }
  }

  it('costs $4.99 on an event and $1.99 on a classified', () => {
    assert.equal(FEATURED_EVENT_FEE, 4.99)
    assert.equal(FEATURED_CLASSIFIED_FEE, 1.99)
  })

  it('adds up only what featured listings still owe', () => {
    assert.equal(
      featuredOwing([
        row(true, 1.99, 'UNPAID'),
        row(true, 1.99, 'INVOICED'),
        row(true, 1.99, 'PAID'),
        // A plain listing owes nothing, whatever is sitting in its fee column.
        row(false, 1.99, 'UNPAID'),
      ]),
      3.98
    )
  })

  it('adds up what each listing was actually charged, not a current price', () => {
    // The fee is snapshotted on the row, which is what lets one list hold
    // listings sold at different prices — an old price, or the other listing
    // type's. Totalling at a constant would quietly rewrite the invoice.
    assert.equal(
      featuredOwing([
        row(true, 4.99, 'UNPAID'),
        row(true, 1.99, 'UNPAID'),
        row(true, 2.99, 'UNPAID'), // whatever it was sold at
      ]),
      9.97
    )
  })

  it('counts a fee as outstanding until it is paid', () => {
    assert.equal(isFeeOutstanding('UNPAID'), true)
    assert.equal(isFeeOutstanding('INVOICED'), true)
    assert.equal(isFeeOutstanding('PAID'), false)
  })

  it('adds in cents, so three fees do not drift', () => {
    // 1.99 * 3 in floating point is 5.970000000000001.
    assert.equal(
      featuredOwing([
        row(true, 1.99, 'UNPAID'),
        row(true, 1.99, 'UNPAID'),
        row(true, 1.99, 'UNPAID'),
      ]),
      5.97
    )
  })

  it('is zero when nothing is featured', () => {
    assert.equal(featuredOwing([row(false, 0, 'UNPAID')]), 0)
    assert.equal(featuredOwing([]), 0)
  })
})

describe('what the featured upgrade is worth', () => {
  function row(featured: boolean, featuredFee: number, featuredPaid: string) {
    return { featured, featuredFee, featuredPaid }
  }

  it('splits what was charged into collected and still owed', () => {
    const totals = featuredTotals([
      row(true, 4.99, 'PAID'),
      row(true, 4.99, 'INVOICED'),
      row(true, 1.99, 'UNPAID'),
      // A plain listing is not a sale, whatever sits in its fee column.
      row(false, 1.99, 'UNPAID'),
    ])

    assert.deepEqual(totals, {
      count: 3,
      booked: 11.97,
      collected: 4.99,
      outstanding: 6.98,
    })
  })

  it('adds in cents, so the halves still make the whole', () => {
    const totals = featuredTotals([
      row(true, 1.99, 'PAID'),
      row(true, 1.99, 'UNPAID'),
      row(true, 1.99, 'UNPAID'),
    ])

    assert.equal(totals.booked, 5.97)
    assert.equal(totals.collected + totals.outstanding, totals.booked)
  })

  it('is all zeroes when nothing is featured', () => {
    assert.deepEqual(featuredTotals([]), {
      count: 0,
      booked: 0,
      collected: 0,
      outstanding: 0,
    })
  })

  it('owes exactly what the totals say is outstanding', () => {
    const rows = [row(true, 4.99, 'INVOICED'), row(true, 1.99, 'PAID')]
    assert.equal(featuredOwing(rows), featuredTotals(rows).outstanding)
  })
})

describe('when a featured fee counts', () => {
  const created = new Date('2026-07-02T09:00:00Z')
  const published = new Date('2026-08-14T00:00:00Z')

  it('counts a placed listing on the day its issue goes out', () => {
    // Sold in July for an August issue: August money, the same way a booking's
    // revenue follows its issue rather than its paperwork.
    assert.equal(
      featuredEarnedOn({ createdAt: created, issue: { publishDate: published } }).getTime(),
      published.getTime()
    )
  })

  it('counts a listing still in the queue from the day it came in', () => {
    assert.equal(featuredEarnedOn({ createdAt: created, issue: null }).getTime(), created.getTime())
    assert.equal(featuredEarnedOn({ createdAt: created }).getTime(), created.getTime())
  })
})

describe('the featured classified payment link', () => {
  it('tags the payment with the listing it belongs to', () => {
    const url = new URL(featuredClassifiedPaymentUrl('clx123abc'))
    assert.equal(url.origin, 'https://buy.stripe.com')
    assert.equal(url.searchParams.get('client_reference_id'), 'clx123abc')
  })

  it('is the bare link when there is no listing to tag it with', () => {
    // The public form's success screen has an id; a link pasted from anywhere
    // else may not, and an untagged payment still has to reach Stripe.
    assert.equal(featuredClassifiedPaymentUrl().includes('?'), false)
    assert.equal(featuredClassifiedPaymentUrl(null).includes('?'), false)
    assert.equal(featuredClassifiedPaymentUrl('').includes('?'), false)
  })

  it('drops a reference Stripe would reject rather than sending it', () => {
    assert.equal(featuredClassifiedPaymentUrl('has spaces').includes('?'), false)
    assert.equal(featuredClassifiedPaymentUrl('../../escape').includes('?'), false)
    assert.equal(featuredClassifiedPaymentUrl('a'.repeat(201)).includes('?'), false)
    // 200 is the limit, not one past it.
    assert.equal(featuredClassifiedPaymentUrl('a'.repeat(200)).includes('?'), true)
  })
})
