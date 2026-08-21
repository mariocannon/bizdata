import {
  AGE_RANGES,
  AREAS,
  EDUCATION,
  HOBBIES,
  HOME_OWNERSHIP,
  HOME_VALUES,
  HOUSEHOLD_INCOMES,
  PETS,
  TOPICS,
  isNonAnswer,
} from '@/lib/survey-options'

/**
 * The numbers the public media kit is allowed to publish.
 *
 * /survey shows the reader survey as it is: exact counts, exact shares, every
 * bucket. That is the right shape for the person running the newsletter, who
 * knows the sample and can read around it. It is the wrong shape for a stranger
 * deciding whether to spend money — "37.4% of readers" reads as a measurement
 * when one more response would move it by a point, and a rate card built on
 * spurious precision is a promise nobody can keep.
 *
 * So everything that leaves this module is blunt on purpose:
 *
 * - **Grouped.** Eleven income brackets become three bands, eight age brackets
 *   become four. An advertiser is choosing between "worth it" and "not", not
 *   reading a census.
 * - **Rounded to 5%**, and phrased in plain words ("2 in 3") wherever a
 *   headline needs one. `<5%` and `>95%` stand in at the ends so a share is
 *   never reported as 0 or 100.
 * - **Floored.** Nothing is published off fewer than `MIN_ANSWERS` answers to
 *   the question in hand.
 * - **Never a count.** No response totals, no per-option counts. The only raw
 *   number this module will hand out is a banded one from `bandCount`.
 *
 * It is deliberately free of `server-only` and of any database import: it is
 * pure arithmetic over rows somebody else fetched, which is what lets
 * `lib/media-kit.test.ts` hold it to the rules above.
 */

/**
 * A response, as the media kit reads one. A `SurveyResponse` from
 * `lib/survey.ts` satisfies it structurally — everything the media kit does not
 * publish (occupation, gender, relationship status, investable assets, whether
 * they left an email) is simply not in the shape.
 */
export type MediaKitRow = {
  area: string | null
  topics: string[]
  ageRange: string | null
  education: string | null
  homeOwnership: string | null
  homeValue: string | null
  householdIncome: string | null
  childrenAtHome: string | null
  hobby: string | null
  pets: string[]
}

/**
 * The floor for publishing anything, counted per question rather than per
 * response — every question but suburb and topics is optional, so a page with
 * plenty of responses can still be thin on income.
 *
 * Thirty is the same threshold /survey uses to warn that "the percentages move
 * a lot with each new one". Internally that is a caveat to read around. Here it
 * has to be a floor: an advertiser can't read around anything.
 */
export const MIN_ANSWERS = 30

/** Shares are rounded to the nearest five points, everywhere. */
const STEP = 5

// ── Phrasing ─────────────────────────────────────────────────────────────────

export type Approx = {
  /** "~35%", "<5%", ">95%" — never an exact figure. */
  percent: string
  /** "2 in 3", "Half", "Nearly all" — the headline phrasing. */
  words: string
  /**
   * 0–100, for a bar's width. Rounded like the label, but floored at 2 so a
   * real-but-small band still draws something rather than vanishing.
   */
  width: number
}

/**
 * The fractions people actually say out loud. A share is reported as whichever
 * of these it is nearest — "1 in 3" rather than "34%" — because the whole point
 * is to stop a reader doing arithmetic on a number that can't carry it.
 */
const FRACTIONS: { value: number; words: string }[] = [
  { value: 0.1, words: '1 in 10' },
  { value: 0.2, words: '1 in 5' },
  { value: 0.25, words: '1 in 4' },
  { value: 1 / 3, words: '1 in 3' },
  { value: 0.4, words: '2 in 5' },
  { value: 0.5, words: 'Half' },
  { value: 0.6, words: '3 in 5' },
  { value: 2 / 3, words: '2 in 3' },
  { value: 0.75, words: '3 in 4' },
  { value: 0.8, words: '4 in 5' },
  { value: 0.9, words: '9 in 10' },
]

/** Nearest five points, as a whole number. */
function rounded(share: number): number {
  return Math.round((share * 100) / STEP) * STEP
}

export function approxPercent(share: number): string {
  if (share <= 0) return '0%'
  const percent = rounded(share)
  // The ends are the one place rounding could overclaim: a single hold-out
  // among a hundred would otherwise be published as "everybody".
  if (percent <= 0) return '<5%'
  if (percent >= 100) return share >= 1 ? 'All' : '>95%'
  return `~${percent}%`
}

export function inWords(share: number): string {
  if (share <= 0) return 'None'
  if (share >= 1) return 'All'
  if (share >= 0.95) return 'Nearly all'
  if (share < 0.075) return 'Fewer than 1 in 10'

  let nearest = FRACTIONS[0]
  for (const fraction of FRACTIONS) {
    if (Math.abs(share - fraction.value) < Math.abs(share - nearest.value)) {
      nearest = fraction
    }
  }
  return nearest.words
}

function approx(share: number): Approx {
  return {
    percent: approxPercent(share),
    words: inWords(share),
    width: share <= 0 ? 0 : Math.max(2, Math.min(100, rounded(share))),
  }
}

/**
 * A count as a floor with a "+" on it — "2,000+", "400+". For the figures the
 * operator supplies by hand (subscribers, opens), so the media kit reports the
 * size of the audience without pinning it to a number that is stale the day
 * after it is typed.
 */
export function bandCount(value: number): string {
  if (!Number.isFinite(value) || value < 0) return ''
  const n = Math.floor(value)
  if (n < 10) return 'a handful'

  const step = n < 100 ? 10 : n < 500 ? 50 : n < 1000 ? 100 : n < 5000 ? 500 : 1000
  const floored = Math.floor(n / step) * step
  return `${floored.toLocaleString('en-NZ')}+`
}

// ── Counting ─────────────────────────────────────────────────────────────────

/**
 * Answers to a single-choice question. "Prefer not to say" is not an answer:
 * it is left out of the numerator *and* the denominator, so a share is always
 * "of the readers who told us", which is what the page says it is.
 */
function countSingle(
  rows: MediaKitRow[],
  pick: (row: MediaKitRow) => string | null
): { counts: Map<string, number>; base: number } {
  const counts = new Map<string, number>()
  let base = 0

  for (const row of rows) {
    const value = pick(row)
    if (!value || isNonAnswer(value)) continue
    base += 1
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  return { counts, base }
}

/** The same for a tick-all-that-apply question. Shares are of respondents. */
function countMulti(
  rows: MediaKitRow[],
  pick: (row: MediaKitRow) => string[]
): { counts: Map<string, number>; base: number } {
  const counts = new Map<string, number>()
  let base = 0

  for (const row of rows) {
    const values = pick(row).filter((value) => !isNonAnswer(value))
    if (values.length === 0) continue
    base += 1
    // A duplicate inside one response must not count twice.
    for (const value of new Set(values)) {
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
  }

  return { counts, base }
}

function sum(counts: Map<string, number>, options: readonly string[]): number {
  return options.reduce((total, option) => total + (counts.get(option) ?? 0), 0)
}

/** The share of answers landing in `options`, or null below the floor. */
function shareOf(
  rows: MediaKitRow[],
  pick: (row: MediaKitRow) => string | null,
  options: readonly string[]
): Approx | null {
  const { counts, base } = countSingle(rows, pick)
  if (base < MIN_ANSWERS) return null
  return approx(sum(counts, options) / base)
}

function multiShareOf(
  rows: MediaKitRow[],
  pick: (row: MediaKitRow) => string[],
  options: readonly string[]
): Approx | null {
  const { counts, base } = countMulti(rows, pick)
  if (base < MIN_ANSWERS) return null
  return approx(sum(counts, options) / base)
}

// ── Bands ────────────────────────────────────────────────────────────────────

export type Band = Approx & { label: string }

export type Breakdown = {
  title: string
  bands: Band[]
}

export type BandGroup = { label: string; options: readonly string[] }

/**
 * The groupings. Every option of every question below is either in exactly one
 * band or is a non-answer — `lib/media-kit.test.ts` checks that against the
 * survey's own option lists, so adding a bracket to the survey and forgetting
 * it here fails a test rather than quietly shrinking a denominator.
 */
export const AGE_BANDS: BandGroup[] = [
  { label: 'Under 35', options: ['Under 18', '18-24', '25-34'] },
  { label: '35–54', options: ['35-44', '45-54'] },
  { label: '55–74', options: ['55-64', '65-74'] },
  { label: '75 and over', options: ['75+'] },
]

export const INCOME_BANDS: BandGroup[] = [
  {
    label: 'Under $100k',
    options: ['Under $50,000', '$50,000-$74,999', '$75,000-$99,999'],
  },
  { label: '$100k–$200k', options: ['$100,000-$149,999', '$150,000-$199,999'] },
  {
    label: 'Over $200k',
    options: [
      '$200,000-$299,999',
      '$300,000-$499,999',
      '$500,000-$749,999',
      '$750,000-$999,999',
      'Over $1 million',
    ],
  },
]

export const OWNERSHIP_BANDS: BandGroup[] = [
  {
    label: 'Own their home',
    options: [
      'I own my home',
      'I own my home and am moving soon',
      'I own more than one home',
    ],
  },
  { label: 'Renting', options: ['I rent my home', 'I rent my home and am moving soon'] },
  { label: 'Another arrangement', options: ['Other'] },
]

export const HOME_VALUE_BANDS: BandGroup[] = [
  {
    label: 'Under $1M',
    options: ['Under $600,000', '$600,000-$799,999', '$800,000-$999,999'],
  },
  { label: '$1M–$2M', options: ['$1M-$1.24M', '$1.25M-$1.49M', '$1.5M-$1.99M'] },
  { label: 'Over $2M', options: ['$2M-$2.99M', 'Over $3 million'] },
]

/** The options that count as owning, for the headline stat. */
const OWNERS = OWNERSHIP_BANDS[0].options
const INCOME_OVER_100K = [...INCOME_BANDS[1].options, ...INCOME_BANDS[2].options]
const AGED_45_PLUS = ['45-54', '55-64', '65-74', '75+']
const DEGREE = [
  'Bachelor degree',
  'Master degree',
  'Professional degree (MD, JD, etc.)',
  'Doctorate (PhD, EdD, etc.)',
]

function bandsFor(
  rows: MediaKitRow[],
  pick: (row: MediaKitRow) => string | null,
  groups: BandGroup[],
  title: string
): Breakdown | null {
  const { counts, base } = countSingle(rows, pick)
  if (base < MIN_ANSWERS) return null

  return {
    title,
    // Bands stay in the order they are declared: these are all ordered scales,
    // and ranking them by size would throw away the shape.
    bands: groups.map((group) => ({
      label: group.label,
      ...approx(sum(counts, group.options) / base),
    })),
  }
}

// ── The page's numbers ───────────────────────────────────────────────────────

/** One plain-words claim: "2 in 3" + "own their home". */
export type Claim = { words: string; claim: string }

export type MediaKitAudience = {
  /** The four numbers at the top. Any that missed the floor are absent. */
  headlines: Claim[]
  /** Age, income, home ownership, home value — whichever cleared the floor. */
  profile: Breakdown[]
  /** What readers asked to see covered, biggest first. */
  topics: Band[] | null
  /** Sellable interests — pets and hobbies. */
  interests: Claim[]
  /** Suburbs that came back at least once, in coast order, without counts. */
  suburbs: string[]
}

/**
 * How each hobby is said in a sentence, so a claim reads "1 in 4 garden"
 * rather than "1 in 4 Gardening". The survey's own labels are written for a
 * radio button, not for prose.
 */
const HOBBY_CLAIMS: Record<string, string> = {
  Gardening: 'garden',
  'Exercising (gym, running, yoga)': 'are at the gym, running or on the mat',
  Golf: 'play golf',
  'Fishing or boating': 'fish or get out on the water',
  'Walking or hiking': 'walk or hike',
  'Cooking or baking': 'cook or bake',
  Reading: 'read',
  Travel: 'travel',
  'DIY and home projects': 'take on DIY and home projects',
  'Photography, art or craft': 'pick up a camera, a brush or a craft',
}

const PET_CLAIMS: Record<string, string> = {
  'Yes, a dog or dogs': 'have a dog',
  'Yes, a cat or cats': 'have a cat',
}

/**
 * Rolls the survey up into everything the media kit shows, or null when there
 * simply isn't enough of it yet — in which case the page drops the audience
 * section rather than publishing a shape drawn through three points.
 */
export function buildAudience(rows: MediaKitRow[]): MediaKitAudience | null {
  if (rows.length < MIN_ANSWERS) return null

  const headlines: Claim[] = []
  const add = (approxOrNull: Approx | null, claim: string) => {
    if (approxOrNull) headlines.push({ words: approxOrNull.words, claim })
  }

  add(shareOf(rows, (row) => row.homeOwnership, OWNERS), 'own their home')
  add(
    shareOf(rows, (row) => row.householdIncome, INCOME_OVER_100K),
    'are in a household earning over $100,000'
  )
  add(shareOf(rows, (row) => row.ageRange, AGED_45_PLUS), 'are 45 or over')
  add(shareOf(rows, (row) => row.childrenAtHome, ['Yes']), 'have children at home')
  add(shareOf(rows, (row) => row.education, DEGREE), 'hold a degree')

  const profile = [
    bandsFor(rows, (row) => row.ageRange, AGE_BANDS, 'Age'),
    bandsFor(rows, (row) => row.householdIncome, INCOME_BANDS, 'Household income'),
    bandsFor(rows, (row) => row.homeOwnership, OWNERSHIP_BANDS, 'Home'),
    bandsFor(rows, (row) => row.homeValue, HOME_VALUE_BANDS, 'What their home is worth'),
  ].filter((breakdown): breakdown is Breakdown => breakdown !== null)

  // --- Topics -------------------------------------------------------------
  const topicCounts = countMulti(rows, (row) => row.topics)
  const topics =
    topicCounts.base < MIN_ANSWERS
      ? null
      : TOPICS.map((topic) => ({
          label: topic,
          ...approx((topicCounts.counts.get(topic) ?? 0) / topicCounts.base),
        })).sort((a, b) => b.width - a.width || a.label.localeCompare(b.label))

  // --- Interests ----------------------------------------------------------
  const interests: Claim[] = []

  for (const [option, claim] of Object.entries(PET_CLAIMS)) {
    const share = multiShareOf(rows, (row) => row.pets, [option])
    if (share) interests.push({ words: share.words, claim })
  }

  const hobbies = countSingle(rows, (row) => row.hobby)
  if (hobbies.base >= MIN_ANSWERS) {
    const ranked = HOBBIES.filter((hobby) => HOBBY_CLAIMS[hobby])
      .map((hobby) => ({
        hobby,
        share: (hobbies.counts.get(hobby) ?? 0) / hobbies.base,
      }))
      .sort((a, b) => b.share - a.share)
      .slice(0, 2)

    for (const { hobby, share } of ranked) {
      if (share <= 0) continue
      interests.push({ words: inWords(share), claim: HOBBY_CLAIMS[hobby] })
    }
  }

  // --- Suburbs ------------------------------------------------------------
  // Named, never counted, and in the survey's own order, which runs down the
  // coast from Puhoi to Ōkura — ranking them by size would publish which
  // suburbs the newsletter is weakest in, which is nobody's business but ours.
  const seen = new Set(rows.map((row) => row.area).filter(Boolean) as string[])
  const suburbs = AREAS.filter(
    (area) => area !== 'None of the above' && seen.has(area)
  ) as string[]

  return { headlines, profile, topics, interests, suburbs }
}

/**
 * Re-exported for the test, which walks every option of every grouped question
 * to prove the bands cover them.
 */
export const GROUPED_QUESTIONS: { options: readonly string[]; bands: BandGroup[] }[] = [
  { options: AGE_RANGES, bands: AGE_BANDS },
  { options: HOUSEHOLD_INCOMES, bands: INCOME_BANDS },
  { options: HOME_OWNERSHIP, bands: OWNERSHIP_BANDS },
  { options: HOME_VALUES, bands: HOME_VALUE_BANDS },
]

/** The single-option lists the headlines read, checked the same way. */
export const HEADLINE_OPTIONS: { options: readonly string[]; picked: readonly string[] }[] =
  [
    { options: HOME_OWNERSHIP, picked: OWNERS },
    { options: HOUSEHOLD_INCOMES, picked: INCOME_OVER_100K },
    { options: AGE_RANGES, picked: AGED_45_PLUS },
    { options: EDUCATION, picked: DEGREE },
    { options: PETS, picked: Object.keys(PET_CLAIMS) },
    { options: HOBBIES, picked: Object.keys(HOBBY_CLAIMS) },
  ]
