import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { check, clientIp, reset } from './rate-limit'

const MINUTE = 60_000

describe('check', () => {
  beforeEach(() => reset())

  it('allows up to the limit and blocks the next one', () => {
    const now = 1_000_000
    for (let i = 0; i < 3; i++) {
      assert.equal(check('ip', 3, 10 * MINUTE, now).ok, true, `request ${i + 1}`)
    }
    assert.equal(check('ip', 3, 10 * MINUTE, now).ok, false)
  })

  it('counts down the remaining allowance', () => {
    const now = 1_000_000
    assert.equal(check('ip', 3, MINUTE, now).remaining, 2)
    assert.equal(check('ip', 3, MINUTE, now).remaining, 1)
    assert.equal(check('ip', 3, MINUTE, now).remaining, 0)
  })

  it('reports how long until the window resets', () => {
    const now = 1_000_000
    check('ip', 1, 10 * MINUTE, now)
    const blocked = check('ip', 1, 10 * MINUTE, now + 4 * MINUTE)
    assert.equal(blocked.ok, false)
    assert.equal(blocked.retryAfter, 6 * 60)
  })

  it('opens a fresh window once the old one expires', () => {
    const now = 1_000_000
    check('ip', 1, MINUTE, now)
    assert.equal(check('ip', 1, MINUTE, now + 30_000).ok, false)
    assert.equal(check('ip', 1, MINUTE, now + MINUTE + 1).ok, true)
  })

  it('counts each caller separately', () => {
    const now = 1_000_000
    check('a', 1, MINUTE, now)
    assert.equal(check('a', 1, MINUTE, now).ok, false)
    assert.equal(check('b', 1, MINUTE, now).ok, true)
  })
})

describe('clientIp', () => {
  it('prefers the Netlify header', () => {
    const headers = new Headers({
      'x-nf-client-connection-ip': '203.0.113.7',
      'x-forwarded-for': '198.51.100.1',
    })
    assert.equal(clientIp(headers), '203.0.113.7')
  })

  it('takes the first entry of x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1' })
    assert.equal(clientIp(headers), '198.51.100.1')
  })

  it('falls back to a shared bucket rather than no limit at all', () => {
    assert.equal(clientIp(new Headers()), 'unknown')
  })
})
