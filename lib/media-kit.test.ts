import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  GROUPED_QUESTIONS,
  HEADLINE_OPTIONS,
  MIN_ANSWERS,
  approxPercent,
  bandCount,
  buildAudience,
  inWords,
  type MediaKitRow,
} from './media-kit'
import { isNonAnswer } from './survey-options'

/** A response with nothing answered, for tests to fill in one field at a time. */
function blank(): MediaKitRow {
  return {
    area: null,
    topics: [],
    ageRange: null,
    education: null,
    homeOwnership: null,
    homeValue: null,
    householdIncome: null,
    childrenAtHome: null,
    hobby: null,
    pets: [],
  }
}

function rows(count: number, fill: (row: MediaKitRow, index: number) => void) {
  return Array.from({ length: count }, (_, index) => {
    const row = blank()
    fill(row, index)
    return row
  })
}

describe('rounding a share', () => {
  it('rounds to the nearest five points', () => {
    assert.equal(approxPercent(0.374), '~35%')
    assert.equal(approxPercent(0.376), '~40%')
    assert.equal(approxPercent(0.5), '~50%')
  })

  it('never publishes 0% or 100% for a share that is neither', () => {
    assert.equal(approxPercent(0.004), '<5%')
    assert.equal(approxPercent(0.996), '>95%')
    // Actually none and actually everybody are still allowed to say so.
    assert.equal(approxPercent(0), '0%')
    assert.equal(approxPercent(1), 'All')
  })

  it('says the fraction people would say out loud', () => {
    assert.equal(inWords(0.34), '1 in 3')
    assert.equal(inWords(0.66), '2 in 3')
    assert.equal(inWords(0.48), 'Half')
    assert.equal(inWords(0.73), '3 in 4')
    assert.equal(inWords(0.97), 'Nearly all')
    assert.equal(inWords(0.03), 'Fewer than 1 in 10')
  })
})

describe('banding a count', () => {
  it('floors to a round step and adds a plus', () => {
    assert.equal(bandCount(47), '40+')
    assert.equal(bandCount(132), '100+')
    assert.equal(bandCount(2431), '2,000+')
    assert.equal(bandCount(12_800), '12,000+')
  })

  it("doesn't dress up a number too small to band", () => {
    assert.equal(bandCount(6), 'a handful')
  })
})

describe('the bands', () => {
  it('cover every option of every question they group, exactly once', () => {
    for (const question of GROUPED_QUESTIONS) {
      for (const option of question.options) {
        if (isNonAnswer(option)) continue
        const hits = question.bands.filter((band) =>
          (band.options as readonly string[]).includes(option)
        )
        assert.equal(
          hits.length,
          1,
          `"${option}" lands in ${hits.length} bands, not 1 — a band was not updated when the survey changed`
        )
      }
    }
  })

  it('never bands a "prefer not to say" into a published share', () => {
    for (const question of GROUPED_QUESTIONS) {
      for (const band of question.bands) {
        for (const option of band.options) {
          assert.equal(isNonAnswer(option), false, `"${option}" is not an answer`)
        }
      }
    }
  })

  it('reads the headline stats off options the survey actually offers', () => {
    for (const { options, picked } of HEADLINE_OPTIONS) {
      for (const option of picked) {
        assert.ok(
          (options as readonly string[]).includes(option),
          `"${option}" is no longer an option on that question`
        )
      }
    }
  })
})

describe('what gets published', () => {
  it('publishes nothing at all below the floor', () => {
    const thin = rows(MIN_ANSWERS - 1, (row) => {
      row.area = 'Ōrewa'
      row.homeOwnership = 'I own my home'
    })
    assert.equal(buildAudience(thin), null)
  })

  it('publishes a question only once that question clears the floor', () => {
    // Everyone answers ownership; only a handful answer income.
    const sample = rows(MIN_ANSWERS + 10, (row, index) => {
      row.homeOwnership = index % 4 === 0 ? 'I rent my home' : 'I own my home'
      if (index < 5) row.householdIncome = '$150,000-$199,999'
    })

    const audience = buildAudience(sample)
    assert.ok(audience)
    const titles = audience.profile.map((breakdown) => breakdown.title)
    assert.ok(titles.includes('Home'))
    assert.ok(!titles.includes('Household income'))
  })

  it('leaves "prefer not to say" out of the denominator', () => {
    // 40 answer, 30 of them own; another 40 decline. Counting the decliners
    // would report 3 in 8 rather than the 3 in 4 who actually own.
    const sample = [
      ...rows(30, (row) => {
        row.homeOwnership = 'I own my home'
      }),
      ...rows(10, (row) => {
        row.homeOwnership = 'I rent my home'
      }),
      ...rows(40, (row) => {
        row.homeOwnership = 'Prefer not to say'
      }),
    ]

    const audience = buildAudience(sample)
    assert.ok(audience)
    assert.deepEqual(audience.headlines[0], {
      words: '3 in 4',
      claim: 'own their home',
    })

    const home = audience.profile.find((breakdown) => breakdown.title === 'Home')
    assert.equal(home?.bands[0].percent, '~75%')
    assert.equal(home?.bands[1].percent, '~25%')
  })

  it('hands out no exact figure anywhere — only rounded shares and words', () => {
    const sample = rows(MIN_ANSWERS + 7, (row, index) => {
      row.area = 'Manly'
      row.topics = index % 3 === 0 ? ['Real estate'] : ['Event coverage', 'Restaurant news']
      row.ageRange = '55-64'
      row.homeOwnership = 'I own my home'
      row.householdIncome = '$100,000-$149,999'
      row.homeValue = '$1.5M-$1.99M'
      row.childrenAtHome = index % 5 === 0 ? 'Yes' : 'No'
      row.education = 'Bachelor degree'
      row.hobby = 'Golf'
      row.pets = ['Yes, a dog or dogs']
    })

    const audience = buildAudience(sample)
    assert.ok(audience)

    const published = [
      ...audience.profile.flatMap((breakdown) => breakdown.bands),
      ...(audience.topics ?? []),
    ]
    for (const band of published) {
      assert.match(band.percent, /^(~\d{1,2}%|<5%|>95%|0%|All)$/)
    }
    // A bar's width is the same rounded figure, so nothing exact leaks through
    // the layout either.
    for (const band of published) {
      assert.ok(band.width === 0 || band.width === 2 || band.width % 5 === 0)
    }
  })

  it('ranks the topics readers asked for, biggest first', () => {
    const sample = rows(MIN_ANSWERS + 10, (row, index) => {
      row.topics = index % 4 === 0 ? ['Event coverage'] : ['Real estate', 'Event coverage']
    })

    const audience = buildAudience(sample)
    assert.equal(audience?.topics?.[0].label, 'Event coverage')
    assert.equal(audience?.topics?.[1].label, 'Real estate')
  })

  it('names suburbs down the coast rather than ranking them', () => {
    const sample = rows(MIN_ANSWERS + 3, (row, index) => {
      // Gulf Harbour is the busiest and the last one down the coast: if the
      // list were ranked it would come first.
      row.area = index < 5 ? 'Ōrewa' : index < 8 ? 'None of the above' : 'Gulf Harbour'
    })

    const audience = buildAudience(sample)
    assert.deepEqual(audience?.suburbs, ['Ōrewa', 'Gulf Harbour'])
  })
})
