import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { FEATURED_FEE, featuredOwing, isFeeOutstanding } from './featured'

describe('the featured upgrade', () => {
  /** A row as either listing page holds it — only the fee fields matter here. */
  function row(featured: boolean, featuredFee: number, featuredPaid: string) {
    return { featured, featuredFee, featuredPaid }
  }

  it('costs $1.99', () => {
    assert.equal(FEATURED_FEE, 1.99)
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

  it('adds up what each listing was actually charged, not the current price', () => {
    // The fee is snapshotted on the row, so a listing sold at the old price is
    // still owed at the old price. Totalling at FEATURED_FEE would quietly
    // rewrite the invoice.
    assert.equal(
      featuredOwing([
        row(true, 4.99, 'UNPAID'), // sold before the price came down
        row(true, 1.99, 'UNPAID'),
      ]),
      6.98
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
