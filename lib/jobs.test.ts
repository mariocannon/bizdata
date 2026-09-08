import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  JOB_PRICES,
  JOB_RUN_DAYS,
  LAUNCH_ENDS,
  LAUNCH_STANDARD_PRICE,
  defaultClosesAt,
  displayTown,
  inLaunchWindow,
  isFeeOutstanding,
  isOpen,
  jobMeta,
  priceForTier,
  requiresWordCount,
  shouldAutoArchive,
} from './jobs'

/** A day before and a day after the launch window closes. */
const DURING_LAUNCH = new Date(LAUNCH_ENDS.getTime() - 24 * 60 * 60 * 1000)
const AFTER_LAUNCH = new Date(LAUNCH_ENDS.getTime() + 24 * 60 * 60 * 1000)

describe('requiresWordCount', () => {
  it('enforces the cap on approved and published listings', () => {
    assert.equal(requiresWordCount('APPROVED'), true)
    assert.equal(requiresWordCount('PUBLISHED'), true)
  })

  it('lets drafts and archived listings run long', () => {
    assert.equal(requiresWordCount('DRAFT'), false)
    assert.equal(requiresWordCount('ARCHIVED'), false)
  })
})

describe('priceForTier', () => {
  it('charges the launch price for a Standard listing inside the window', () => {
    assert.equal(priceForTier('STANDARD', DURING_LAUNCH), LAUNCH_STANDARD_PRICE)
    assert.equal(priceForTier('STANDARD', DURING_LAUNCH), 19.99)
  })

  it('charges the full Standard price once the window has closed', () => {
    assert.equal(priceForTier('STANDARD', AFTER_LAUNCH), JOB_PRICES.STANDARD)
    assert.equal(priceForTier('STANDARD', AFTER_LAUNCH), 49)
  })

  it('never discounts Featured or Community', () => {
    assert.equal(priceForTier('FEATURED', DURING_LAUNCH), 89)
    assert.equal(priceForTier('FEATURED', AFTER_LAUNCH), 89)
    assert.equal(priceForTier('COMMUNITY', DURING_LAUNCH), 14.99)
    assert.equal(priceForTier('COMMUNITY', AFTER_LAUNCH), 14.99)
  })

  it('treats the launch end instant as already closed', () => {
    assert.equal(inLaunchWindow(LAUNCH_ENDS), false)
    assert.equal(priceForTier('STANDARD', LAUNCH_ENDS), 49)
  })
})

describe('defaultClosesAt', () => {
  it('is JOB_RUN_DAYS after the day it is taken', () => {
    const from = new Date('2026-12-01T09:00:00+13:00')
    const closes = defaultClosesAt(from)
    const days = Math.round((closes.getTime() - from.getTime()) / (24 * 60 * 60 * 1000))
    assert.equal(days, JOB_RUN_DAYS)
    assert.equal(JOB_RUN_DAYS, 30)
  })
})

describe('isOpen', () => {
  const now = new Date('2026-12-10T12:00:00+13:00')

  it('is true for a published listing still inside its run', () => {
    assert.equal(
      isOpen({ status: 'PUBLISHED', closesAt: new Date('2026-12-20T00:00:00+13:00') }, now),
      true
    )
  })

  it('is false once the close date has passed', () => {
    assert.equal(
      isOpen({ status: 'PUBLISHED', closesAt: new Date('2026-12-01T00:00:00+13:00') }, now),
      false
    )
  })

  it('is false for anything not published, however fresh', () => {
    const closesAt = new Date('2026-12-31T00:00:00+13:00')
    assert.equal(isOpen({ status: 'APPROVED', closesAt }, now), false)
    assert.equal(isOpen({ status: 'DRAFT', closesAt }, now), false)
  })
})

describe('shouldAutoArchive', () => {
  const now = new Date('2026-12-10T12:00:00+13:00')

  it('archives a listing whose run is over, whatever status it reached', () => {
    const closesAt = new Date('2026-12-01T00:00:00+13:00')
    assert.equal(shouldAutoArchive({ status: 'PUBLISHED', closesAt }, now), true)
    assert.equal(shouldAutoArchive({ status: 'DRAFT', closesAt }, now), true)
  })

  it('leaves a listing still inside its run alone', () => {
    assert.equal(
      shouldAutoArchive(
        { status: 'PUBLISHED', closesAt: new Date('2026-12-20T00:00:00+13:00') },
        now
      ),
      false
    )
  })

  it('never re-archives an archived listing', () => {
    assert.equal(
      shouldAutoArchive(
        { status: 'ARCHIVED', closesAt: new Date('2026-01-01T00:00:00+13:00') },
        now
      ),
      false
    )
  })
})

describe('isFeeOutstanding', () => {
  it('is settled only once marked paid', () => {
    assert.equal(isFeeOutstanding('UNPAID'), true)
    assert.equal(isFeeOutstanding('INVOICED'), true)
    assert.equal(isFeeOutstanding('PAID'), false)
  })
})

describe('displayTown', () => {
  it('macronises Ōrewa for reader-facing copy', () => {
    assert.equal(displayTown('Orewa'), 'Ōrewa')
  })

  it('leaves the already-macronised towns as they are', () => {
    assert.equal(displayTown('Whangaparāoa'), 'Whangaparāoa')
    assert.equal(displayTown('Red Beach'), 'Red Beach')
  })
})

describe('jobMeta', () => {
  it('joins employer, town and type with the pay when there is some', () => {
    assert.equal(
      jobMeta({
        employer: 'Coastline Coffee',
        town: 'Orewa',
        jobType: 'CASUAL',
        pay: '$24–$27/hr',
      }),
      'Coastline Coffee · Ōrewa · Casual · $24–$27/hr'
    )
  })

  it('drops the pay segment when none was given', () => {
    assert.equal(
      jobMeta({ employer: 'Peninsula Electrical', town: 'Whangaparāoa', jobType: 'FULL_TIME', pay: null }),
      'Peninsula Electrical · Whangaparāoa · Full-time'
    )
  })
})
