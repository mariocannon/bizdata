import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  centsFromDollarsSchema,
  centsToDollars,
  centsToInput,
  dollarsToCents,
  parseDollarsToCents,
} from './money'

describe('dollarsToCents', () => {
  it('converts whole dollars', () => {
    assert.equal(dollarsToCents(450), 45000)
    assert.equal(dollarsToCents(0), 0)
  })

  it('converts values with cents', () => {
    assert.equal(dollarsToCents(450.5), 45050)
    assert.equal(dollarsToCents(0.01), 1)
    assert.equal(dollarsToCents(1234.56), 123456)
  })

  it('rounds half up even where the float sits just below the decimal', () => {
    // 1.005 is held as 1.00499999999999989, so a naive Math.round(x * 100)
    // gives 100. Rounding the decimal representation gives the expected 101.
    assert.equal(dollarsToCents(1.005), 101)
    assert.equal(dollarsToCents(8.615), 862)
  })

  it('does not accumulate error across repeated conversions', () => {
    const total = [0.1, 0.2, 0.3].reduce((sum, n) => sum + dollarsToCents(n), 0)
    assert.equal(total, 60)
  })

  it('returns 0 for values that are not finite', () => {
    assert.equal(dollarsToCents(Number.NaN), 0)
    assert.equal(dollarsToCents(Number.POSITIVE_INFINITY), 0)
  })
})

describe('centsToDollars', () => {
  it('is the inverse of dollarsToCents for representable values', () => {
    for (const dollars of [0, 80, 150, 450.5, 1234.56]) {
      assert.equal(centsToDollars(dollarsToCents(dollars)), dollars)
    }
  })
})

describe('parseDollarsToCents', () => {
  it('accepts what an operator actually types', () => {
    assert.equal(parseDollarsToCents('450'), 45000)
    assert.equal(parseDollarsToCents('450.00'), 45000)
    assert.equal(parseDollarsToCents('$450'), 45000)
    assert.equal(parseDollarsToCents('1,250.50'), 125050)
    assert.equal(parseDollarsToCents(' 80 '), 8000)
  })

  it('treats empty as zero', () => {
    assert.equal(parseDollarsToCents(''), 0)
    assert.equal(parseDollarsToCents('   '), 0)
  })

  it('rejects text rather than silently pricing it at zero', () => {
    assert.equal(parseDollarsToCents('abc'), null)
    assert.equal(parseDollarsToCents('45o'), null)
    assert.equal(parseDollarsToCents('1.2.3'), null)
  })
})

describe('centsToInput', () => {
  it('renders a form value with both decimal places', () => {
    assert.equal(centsToInput(45000), '450.00')
    assert.equal(centsToInput(8000), '80.00')
    assert.equal(centsToInput(1), '0.01')
    assert.equal(centsToInput(0), '0.00')
  })
})

describe('centsFromDollarsSchema', () => {
  it('parses a typed price into integer cents', () => {
    assert.equal(centsFromDollarsSchema.parse('450.50'), 45050)
    assert.equal(centsFromDollarsSchema.parse(450.5), 45050)
  })

  it('rejects a negative price', () => {
    const result = centsFromDollarsSchema.safeParse('-1')
    assert.equal(result.success, false)
  })

  it('rejects unparseable text with a usable message', () => {
    const result = centsFromDollarsSchema.safeParse('four hundred')
    assert.equal(result.success, false)
    if (!result.success) {
      assert.match(result.error.issues[0].message, /Enter a price/)
    }
  })

  it('rejects an implausibly large price', () => {
    assert.equal(centsFromDollarsSchema.safeParse('99999999').success, false)
  })
})
