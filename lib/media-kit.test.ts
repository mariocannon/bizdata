import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  MEDIA_KIT_AD_TYPES,
  bookingMailto,
  buildAudienceStats,
  buildRateCard,
  describeAvailability,
  isMediaKitOpen,
} from './media-kit'
import { AD_TYPES } from './enums'
import { DEFAULT_PRICES } from './settings'
import type { AppSettings } from './settings'

function settings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    bulletinCapacity: 3,
    soldOutTarget: 10,
    defaultPrices: { ...DEFAULT_PRICES },
    mediaKitPublished: true,
    mediaKitSubscribers: 1200,
    mediaKitOpenRate: 52,
    mediaKitContactEmail: 'ads@thetide.co.nz',
    ...overrides,
  }
}

describe('the rate card', () => {
  it('lists every ad type the app sells, exactly once', () => {
    const listed = buildRateCard(settings()).map((row) => row.adType)
    assert.equal(listed.length, AD_TYPES.length)
    assert.deepEqual([...listed].sort(), [...AD_TYPES].sort())
  })

  it('leads with the premium placements', () => {
    assert.equal(MEDIA_KIT_AD_TYPES[0], 'HEADLINE')
    assert.equal(MEDIA_KIT_AD_TYPES[1], 'FEATURE')
  })

  it('quotes the price the booking form would pre-fill', () => {
    const prices = { ...DEFAULT_PRICES, HEADLINE: 675 }
    const row = buildRateCard(settings({ defaultPrices: prices })).find(
      (r) => r.adType === 'HEADLINE'
    )
    assert.equal(row?.price, 675)
  })

  it('describes availability from the configured bulletin capacity', () => {
    const rows = buildRateCard(settings({ bulletinCapacity: 5 }))
    const banner = rows.find((r) => r.adType === 'BULLETIN_BANNER')
    const takeover = rows.find((r) => r.adType === 'BULLETIN_TAKEOVER')
    assert.match(banner!.availability, /5 bulletin slots/)
    assert.match(takeover!.availability, /all 5 bulletin slots/)
  })

  it('calls the single-slot placements one per issue', () => {
    assert.equal(describeAvailability('HEADLINE', 3), 'One per issue')
    assert.equal(describeAvailability('FEATURE', 3), 'One per issue')
    assert.equal(describeAvailability('FEATURED_EVENT', 3), 'One per issue')
  })

  it('counts the section sponsorships', () => {
    assert.equal(
      describeAvailability('SECTION_SPONSOR', 3),
      'One per section, across 6 sections'
    )
  })
})

describe('audience stats', () => {
  it('leaves out figures the operator has not filled in', () => {
    const stats = buildAudienceStats(settings({ mediaKitSubscribers: 0 }))
    assert.equal(
      stats.some((s) => s.label === 'Subscribers'),
      false
    )
    assert.equal(
      stats.some((s) => s.label === 'Open rate'),
      true
    )
  })

  it('always says how often it goes out', () => {
    const stats = buildAudienceStats(
      settings({ mediaKitSubscribers: 0, mediaKitOpenRate: 0 })
    )
    assert.deepEqual(
      stats.map((s) => s.label),
      ['Every week']
    )
  })

  it('groups the thousands in the subscriber count', () => {
    const stats = buildAudienceStats(settings({ mediaKitSubscribers: 12500 }))
    assert.equal(stats[0].value, '12,500')
  })
})

describe('publishing', () => {
  it('stays shut until it is published', () => {
    assert.equal(isMediaKitOpen(settings({ mediaKitPublished: false })), false)
  })

  it('stays shut without a contact address, however it is set', () => {
    assert.equal(isMediaKitOpen(settings({ mediaKitContactEmail: null })), false)
    assert.equal(isMediaKitOpen(settings({ mediaKitContactEmail: '' })), false)
  })

  it('opens when both are set', () => {
    assert.equal(isMediaKitOpen(settings()), true)
  })
})

describe('the booking mailto', () => {
  it('addresses the operator and carries a subject', () => {
    const link = bookingMailto('ads@thetide.co.nz')
    assert.ok(link.startsWith('mailto:ads@thetide.co.nz?'))
    assert.match(link, /subject=Advertising%20in%20The%20Tide/)
  })

  it('escapes the body rather than breaking the URL', () => {
    const link = bookingMailto('ads@thetide.co.nz')
    assert.equal(link.includes(' '), false)
    assert.equal(link.includes('\n'), false)
  })
})
