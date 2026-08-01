import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildCapacityReport, checkCapacity, slotState } from './inventory'
import type { BookingLike } from './inventory'

const CAP = 3

function booking(
  adType: string,
  status = 'CONFIRMED',
  section: string | null = null
): BookingLike {
  return { adType, status, section }
}

describe('single-slot ad types', () => {
  for (const adType of ['HEADLINE', 'FEATURE', 'FEATURED_EVENT'] as const) {
    it(`allows the first ${adType} and blocks the second`, () => {
      assert.equal(checkCapacity([], { adType, status: 'CONFIRMED' }, CAP).ok, true)

      const second = checkCapacity([booking(adType)], { adType, status: 'CONFIRMED' }, CAP)
      assert.equal(second.ok, false)
      assert.match(second.reason ?? '', /already has/i)
    })
  }

  it('excludes the booking being edited from its own check', () => {
    const existing = [{ id: 'a', ...booking('HEADLINE') }]
    // canConfirm filters the row out by id before calling checkCapacity, so an
    // edit of the only headline sees an empty issue.
    assert.equal(
      checkCapacity([], { id: 'a', adType: 'HEADLINE', status: 'CONFIRMED' }, CAP).ok,
      true
    )
    assert.equal(existing.length, 1)
  })
})

describe('bulletin block', () => {
  const three = [
    booking('BULLETIN_CLASSIFIED'),
    booking('BULLETIN_BANNER'),
    booking('BULLETIN_CLASSIFIED'),
  ]

  it('shares three slots between classified and banner', () => {
    assert.deepEqual(buildCapacityReport(three, CAP).bulletin, {
      sold: 3,
      cap: 3,
      takeover: false,
    })
    assert.equal(
      checkCapacity(three.slice(0, 2), { adType: 'BULLETIN_BANNER', status: 'CONFIRMED' }, CAP)
        .ok,
      true
    )
  })

  it('blocks a fourth bulletin booking', () => {
    const result = checkCapacity(
      three,
      { adType: 'BULLETIN_BANNER', status: 'CONFIRMED' },
      CAP
    )
    assert.equal(result.ok, false)
    assert.match(result.reason ?? '', /bulletin slots/i)
  })

  it('treats a takeover as consuming the whole block', () => {
    assert.deepEqual(buildCapacityReport([booking('BULLETIN_TAKEOVER')], CAP).bulletin, {
      sold: 3,
      cap: 3,
      takeover: true,
    })
  })

  it('blocks any bulletin ad alongside a takeover, and vice versa', () => {
    assert.equal(
      checkCapacity(
        [booking('BULLETIN_TAKEOVER')],
        { adType: 'BULLETIN_CLASSIFIED', status: 'CONFIRMED' },
        CAP
      ).ok,
      false
    )
    assert.equal(
      checkCapacity(
        [booking('BULLETIN_CLASSIFIED')],
        { adType: 'BULLETIN_TAKEOVER', status: 'CONFIRMED' },
        CAP
      ).ok,
      false
    )
  })

  it('flags oversold when a takeover coexists with another bulletin ad', () => {
    const report = buildCapacityReport(
      [booking('BULLETIN_TAKEOVER'), booking('BULLETIN_CLASSIFIED')],
      CAP
    )
    assert.equal(report.bulletin.sold, 4)
    assert.equal(report.oversold, true)
  })

  it('follows the configured bulletin capacity', () => {
    assert.deepEqual(buildCapacityReport([booking('BULLETIN_TAKEOVER')], 5).bulletin, {
      sold: 5,
      cap: 5,
      takeover: true,
    })
  })
})

describe('section sponsors', () => {
  const weather = [booking('SECTION_SPONSOR', 'CONFIRMED', 'WEATHER')]

  it('allows a different section on the same issue', () => {
    assert.equal(
      checkCapacity(
        weather,
        { adType: 'SECTION_SPONSOR', section: 'GIGS', status: 'CONFIRMED' },
        CAP
      ).ok,
      true
    )
  })

  it('blocks a second sponsor in the same section', () => {
    const result = checkCapacity(
      weather,
      { adType: 'SECTION_SPONSOR', section: 'WEATHER', status: 'CONFIRMED' },
      CAP
    )
    assert.equal(result.ok, false)
    assert.match(result.reason ?? '', /already has a sponsor/i)
  })

  it('requires a section', () => {
    assert.equal(
      checkCapacity([], { adType: 'SECTION_SPONSOR', status: 'CONFIRMED' }, CAP).ok,
      false
    )
  })
})

describe('booking status', () => {
  it('frees the slot when a booking is cancelled', () => {
    assert.deepEqual(buildCapacityReport([booking('HEADLINE', 'CANCELLED')], CAP).headline, {
      sold: 0,
      cap: 1,
    })
    assert.equal(
      checkCapacity(
        [booking('HEADLINE', 'CANCELLED')],
        { adType: 'HEADLINE', status: 'CONFIRMED' },
        CAP
      ).ok,
      true
    )
  })

  it('holds the slot while a booking is only reserved', () => {
    assert.equal(
      checkCapacity(
        [booking('HEADLINE', 'RESERVED')],
        { adType: 'HEADLINE', status: 'CONFIRMED' },
        CAP
      ).ok,
      false
    )
  })
})

describe('report totals', () => {
  it('counts 12 sellable slots per issue at the default capacity', () => {
    // headline + feature + featured event + 3 bulletin + 6 sections
    assert.equal(buildCapacityReport([], CAP).totalCap, 12)
  })

  it('reports OPEN / FULL / OVERSOLD', () => {
    assert.equal(slotState(0, 1), 'OPEN')
    assert.equal(slotState(1, 1), 'FULL')
    assert.equal(slotState(2, 1), 'OVERSOLD')
  })
})
