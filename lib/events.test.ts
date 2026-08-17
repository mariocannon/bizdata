import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  FEATURED_EVENT_FEE,
  eventMeta,
  featuredOwing,
  formatEventWhen,
  formatTime,
  hasTime,
  isFeeOutstanding,
  isUpcoming,
  requiresWordCount,
} from './events'

/** Local-time constructor, matching how the form stores what was typed. */
function at(y: number, m: number, d: number, hh = 0, mm = 0): Date {
  return new Date(y, m - 1, d, hh, mm, 0, 0)
}

describe('hasTime', () => {
  it('is false at midnight — the form uses that for "no time given"', () => {
    assert.equal(hasTime(at(2026, 8, 15)), false)
  })

  it('is true for any other time, including one past midnight', () => {
    assert.equal(hasTime(at(2026, 8, 15, 0, 1)), true)
    assert.equal(hasTime(at(2026, 8, 15, 10, 0)), true)
  })
})

describe('formatTime', () => {
  it('drops the minutes on the hour', () => {
    assert.equal(formatTime(at(2026, 8, 15, 10)), '10am')
    assert.equal(formatTime(at(2026, 8, 15, 14)), '2pm')
  })

  it('keeps the minutes otherwise', () => {
    assert.equal(formatTime(at(2026, 8, 15, 14, 30)), '2:30pm')
  })
})

describe('formatEventWhen', () => {
  it('shows the date alone when no time was given', () => {
    assert.equal(formatEventWhen(at(2026, 8, 15)), 'Sat 15 Aug 2026')
  })

  it('adds the start time when there is one', () => {
    assert.equal(formatEventWhen(at(2026, 8, 15, 10)), 'Sat 15 Aug 2026, 10am')
  })

  it('shows a time range within one day without repeating the date', () => {
    assert.equal(
      formatEventWhen(at(2026, 8, 15, 10), at(2026, 8, 15, 14)),
      'Sat 15 Aug 2026, 10am – 2pm'
    )
  })

  it('spells out both ends when it runs across days', () => {
    assert.equal(
      formatEventWhen(at(2026, 8, 15, 10), at(2026, 8, 16, 16)),
      'Sat 15 Aug 2026, 10am – Sun 16 Aug 2026, 4pm'
    )
  })

  it('ignores a same-day end with no time of its own', () => {
    assert.equal(
      formatEventWhen(at(2026, 8, 15, 10), at(2026, 8, 15)),
      'Sat 15 Aug 2026, 10am'
    )
  })

  it('can drop the year, for narrow columns', () => {
    assert.equal(
      formatEventWhen(at(2026, 8, 15, 10), at(2026, 8, 16, 16), { year: false }),
      'Sat 15 Aug, 10am – Sun 16 Aug, 4pm'
    )
  })

  it('handles a missing or invalid start', () => {
    assert.equal(formatEventWhen(null), '—')
    assert.equal(formatEventWhen(new Date('nonsense')), '—')
  })
})

describe('isUpcoming', () => {
  const now = at(2026, 8, 15, 12)

  it('counts a later event', () => {
    assert.equal(isUpcoming(at(2026, 8, 20, 10), null, now), true)
  })

  it('does not count one that finished this morning', () => {
    assert.equal(isUpcoming(at(2026, 8, 15, 9), at(2026, 8, 15, 11), now), false)
  })

  it('still counts one that is running right now', () => {
    assert.equal(isUpcoming(at(2026, 8, 15, 9), at(2026, 8, 15, 17), now), true)
  })

  it('keeps a date-only event upcoming for the whole of its day', () => {
    // No time given, so it should not expire at midnight on the day itself.
    assert.equal(isUpcoming(at(2026, 8, 15), null, now), true)
  })

  it('drops a date-only event the day after', () => {
    assert.equal(isUpcoming(at(2026, 8, 14), null, now), false)
  })

  it('uses the end date on a multi-day event', () => {
    assert.equal(isUpcoming(at(2026, 8, 10), at(2026, 8, 20), now), true)
  })
})

describe('eventMeta', () => {
  it('joins the when and the where', () => {
    assert.equal(
      eventMeta(at(2026, 8, 15, 10), null, 'Ōrewa Community Hall'),
      'Sat 15 Aug 2026, 10am · Ōrewa Community Hall'
    )
  })

  it('leaves out the separator when there is no venue', () => {
    assert.equal(eventMeta(at(2026, 8, 15, 10), null, null), 'Sat 15 Aug 2026, 10am')
  })
})

describe('the featured upgrade', () => {
  /** A row as the events page holds it — only the fee fields matter here. */
  function row(featured: boolean, featuredFee: number, featuredPaid: string) {
    return { featured, featuredFee, featuredPaid }
  }

  it('costs $4.99', () => {
    assert.equal(FEATURED_EVENT_FEE, 4.99)
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

describe('requiresWordCount', () => {
  it('enforces the cap on approved and published events', () => {
    assert.equal(requiresWordCount('APPROVED'), true)
    assert.equal(requiresWordCount('PUBLISHED'), true)
  })

  it('lets drafts run long', () => {
    assert.equal(requiresWordCount('DRAFT'), false)
  })
})
