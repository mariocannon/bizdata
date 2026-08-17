import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { FEATURED_FEE, featuredOwing, isFeeOutstanding } from './featured'

describe('the featured upgrade', () => {
  /** A row as either listing page holds it — only the fee fields matter here. */
  function row(featured: boolean, featuredFee: number, featuredPaid: string) {
    return { featured, featuredFee, featuredPaid }
  }

  it('costs $4.99', () => {
    assert.equal(FEATURED_FEE, 4.99)
  })

  it('counts a fee as outstanding until it is paid', () => {
    assert.equal(isFeeOutstanding('UNPAID'), true)
    assert.equal(isFeeOutstanding('INVOICED'), true)
    assert.equal(isFeeOutstanding('PAID'), false)
  })

  it('adds up only what featured listings still owe', () => {
    assert.equal(
      featuredOwing([
        row(true, 4.99, 'UNPAID'),
        row(true, 4.99, 'INVOICED'),
        row(true, 4.99, 'PAID'),
        // A plain listing owes nothing, whatever is sitting in its fee column.
        row(false, 4.99, 'UNPAID'),
      ]),
      9.98
    )
  })

  it('adds in cents, so three fees do not drift', () => {
    // 4.99 * 3 in floating point is 14.969999999999999.
    assert.equal(
      featuredOwing([
        row(true, 4.99, 'UNPAID'),
        row(true, 4.99, 'UNPAID'),
        row(true, 4.99, 'UNPAID'),
      ]),
      14.97
    )
  })

  it('is zero when nothing is featured', () => {
    assert.equal(featuredOwing([row(false, 0, 'UNPAID')]), 0)
    assert.equal(featuredOwing([]), 0)
  })
})
