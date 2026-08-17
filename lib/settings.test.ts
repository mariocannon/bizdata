import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DEFAULT_PRICES, settingsSchema } from './settings'

const base = {
  bulletinCapacity: 3,
  soldOutTarget: 10,
  defaultPrices: { ...DEFAULT_PRICES },
  mediaKitPublished: false,
  mediaKitSubscribers: 0,
  mediaKitOpenRate: 0,
  mediaKitContactEmail: null as string | null,
}

const email = settingsSchema.shape.mediaKitContactEmail

describe('the media kit contact email', () => {
  it('clears to null when it is blank', () => {
    assert.equal(email.parse(''), null)
    assert.equal(email.parse('   '), null)
    assert.equal(email.parse(null), null)
  })

  it('keeps a real address, trimmed', () => {
    assert.equal(email.parse('  ads@thetide.co.nz '), 'ads@thetide.co.nz')
  })

  it('rejects a typo rather than storing it', () => {
    assert.equal(email.safeParse('ads@').success, false)
    assert.equal(email.safeParse('not-an-email').success, false)
  })
})

describe('the media kit numbers', () => {
  it('takes a whole percent from 0 to 100', () => {
    assert.equal(
      settingsSchema.safeParse({ ...base, mediaKitOpenRate: 100 }).success,
      true
    )
    assert.equal(
      settingsSchema.safeParse({ ...base, mediaKitOpenRate: 101 }).success,
      false
    )
    assert.equal(
      settingsSchema.safeParse({ ...base, mediaKitOpenRate: -1 }).success,
      false
    )
  })

  it('refuses a negative subscriber count', () => {
    assert.equal(
      settingsSchema.safeParse({ ...base, mediaKitSubscribers: -5 }).success,
      false
    )
  })

  it('leaves the inventory rules alone', () => {
    const parsed = settingsSchema.parse({ ...base, bulletinCapacity: 4 })
    assert.equal(parsed.bulletinCapacity, 4)
    assert.equal(parsed.soldOutTarget, 10)
  })
})
