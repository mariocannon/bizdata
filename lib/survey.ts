import 'server-only'
import { surveyClient, surveyConfigured } from '@/lib/survey-db'
import { isNonAnswer } from '@/lib/survey-options'

/**
 * Reads and rolls up the reader survey.
 *
 * The option lists in `lib/survey-options.ts` mirror the CHECK constraints on
 * `survey_responses`, and this module leans on their order twice: it fixes the
 * display order for the ordered scales (income, age, home value — where sorting
 * by count would destroy the shape of the distribution), and it lets a bucket
 * with zero responses still appear, which is itself a finding.
 */

/** The survey asks about the Hibiscus Coast, so days are bucketed in NZ time. */
const TIME_ZONE = 'Pacific/Auckland'

/**
 * The option lists live in `lib/survey-options.ts` — the media kit needs the
 * same strings and must not import a module that talks to a database. They are
 * re-exported here so `@/lib/survey` stays the one import for reading the
 * survey.
 */
export {
  AREAS,
  TOPICS,
  AGE_RANGES,
  GENDERS,
  EDUCATION,
  RELATIONSHIP_STATUSES,
  HOME_OWNERSHIP,
  HOME_VALUES,
  HOUSEHOLD_INCOMES,
  INVESTMENTS,
  CHILDREN_AT_HOME,
  CHILDREN_AGES,
  HOBBIES,
  PETS,
  isNonAnswer,
} from '@/lib/survey-options'

/**
 * Short display labels. The raw options are written for someone filling in a
 * form ("Certificate or trade qualification (Levels 1-4)") and are far too long
 * to sit on a chart axis. Truncating would make "I own my home" and "I own my
 * home and am moving soon" indistinguishable, so each is shortened by hand and
 * the full text is kept for the tooltip.
 */
const SHORT_LABELS: Record<string, string> = {
  'Prefer not to say': 'Not said',
  'Not sure or prefer not to say': 'Not said',
  'I am not sure': 'Not sure',

  'Did not finish high school': 'No high school',
  'Finished high school (NCEA Level 2 or 3)': 'High school',
  'Certificate or trade qualification (Levels 1-4)': 'Certificate / trade',
  'Diploma or advanced diploma': 'Diploma',
  'Bachelor degree': 'Bachelor',
  'Master degree': 'Master',
  'Professional degree (MD, JD, etc.)': 'Professional',
  'Doctorate (PhD, EdD, etc.)': 'Doctorate',

  'I own my home': 'Own',
  'I own my home and am moving soon': 'Own, moving soon',
  'I own more than one home': 'Own multiple',
  'I rent my home': 'Rent',
  'I rent my home and am moving soon': 'Rent, moving soon',

  'Under $600,000': 'Under $600k',
  '$600,000-$799,999': '$600–800k',
  '$800,000-$999,999': '$800k–1M',
  '$1M-$1.24M': '$1–1.25M',
  '$1.25M-$1.49M': '$1.25–1.5M',
  '$1.5M-$1.99M': '$1.5–2M',
  '$2M-$2.99M': '$2–3M',
  'Over $3 million': 'Over $3M',

  'Under $50,000': 'Under $50k',
  '$50,000-$74,999': '$50–75k',
  '$75,000-$99,999': '$75–100k',
  '$100,000-$149,999': '$100–150k',
  '$150,000-$199,999': '$150–200k',
  '$200,000-$299,999': '$200–300k',
  '$300,000-$499,999': '$300–500k',
  '$500,000-$749,999': '$500–750k',
  '$750,000-$999,999': '$750k–1M',
  'Over $1 million': 'Over $1M',

  'Under $100,000': 'Under $100k',
  '$100,000-$249,999': '$100–250k',
  '$250,000-$499,999': '$250–500k',
  '$500,000-$999,999': '$500k–1M',
  '$1M-$2.9M': '$1–3M',
  '$3M-$4.9M': '$3–5M',
  '$5M-$9.9M': '$5–10M',
  'Over $10 million': 'Over $10M',

  '18+ living at home': '18+ at home',

  'Exercising (gym, running, yoga)': 'Exercising',
  'Photography, art or craft': 'Photo / art / craft',
  'DIY and home projects': 'DIY and home',

  'I do not have pets': 'No pets',
  'Yes, a dog or dogs': 'Dogs',
  'Yes, a cat or cats': 'Cats',
  'Yes, fish': 'Fish',
  'Yes, a bird or birds': 'Birds',
  'Yes, a reptile or reptiles': 'Reptiles',
  'Yes, a small mammal (guinea pig, rabbit, etc.)': 'Small mammals',
}

function shortLabel(option: string): string {
  return SHORT_LABELS[option] ?? option
}

// ── Rows ─────────────────────────────────────────────────────────────────────

/**
 * A response as the page sees it. `email` is deliberately absent: the column is
 * read so we can count who is contactable, but it is reduced to a boolean here
 * so no reader's address travels any further than this module.
 */
export type SurveyResponse = {
  createdAt: string
  area: string | null
  topics: string[]
  occupation: string | null
  education: string | null
  ageRange: string | null
  gender: string | null
  relationshipStatus: string | null
  homeOwnership: string | null
  homeValue: string | null
  householdIncome: string | null
  investments: string | null
  childrenAtHome: string | null
  childrenAges: string[]
  pets: string[]
  hobby: string | null
  /** Free text, and only ever set when `hobby` is "Other". */
  hobbyOther: string | null
  hasEmail: boolean
}

type Row = {
  created_at: string
  area: string | null
  topics: string[] | null
  occupation: string | null
  education: string | null
  age_range: string | null
  gender: string | null
  relationship_status: string | null
  home_ownership: string | null
  home_value: string | null
  household_income: string | null
  investments: string | null
  children_at_home: string | null
  children_ages: string[] | null
  pets: string[] | null
  hobby: string | null
  hobby_other: string | null
  email: string | null
}

const COLUMNS =
  'created_at, area, topics, occupation, education, age_range, gender, relationship_status, home_ownership, home_value, household_income, investments, children_at_home, children_ages, pets, hobby, hobby_other, email'

// ── Distributions ────────────────────────────────────────────────────────────

export type DistributionPoint = {
  /** The full option text, for the tooltip. */
  option: string
  /** The shortened axis label. */
  label: string
  count: number
  /** Of those who answered this question. */
  share: number
  muted: boolean
}

export type Distribution = {
  points: DistributionPoint[]
  /** How many respondents answered this question at all. */
  answered: number
  /** How many skipped it — every field but area and topics is optional. */
  skipped: number
}

type DistributionOptions = {
  /**
   * 'canonical' keeps the survey's own order — required for the ordered scales,
   * where the shape of the distribution is the point. 'count' ranks by size,
   * for lists with no inherent order (suburbs, pets).
   */
  order?: 'canonical' | 'count'
  /** Keep options nobody picked. Honest for a scale, noise for a long list. */
  includeEmpty?: boolean
}

function build(
  counts: Map<string, number>,
  options: readonly string[],
  answered: number,
  total: number,
  { order = 'count', includeEmpty = false }: DistributionOptions
): Distribution {
  let points: DistributionPoint[] = options.map((option) => {
    const count = counts.get(option) ?? 0
    return {
      option,
      label: shortLabel(option),
      count,
      share: answered > 0 ? count / answered : 0,
      muted: isNonAnswer(option),
    }
  })

  if (!includeEmpty) points = points.filter((point) => point.count > 0)

  if (order === 'count') {
    // Non-answers sink to the bottom regardless of size — they are not a result.
    points.sort((a, b) => {
      if (a.muted !== b.muted) return a.muted ? 1 : -1
      return b.count - a.count || a.label.localeCompare(b.label)
    })
  }

  return { points, answered, skipped: total - answered }
}

/** Distribution of a single-choice field. */
export function distribution(
  rows: SurveyResponse[],
  pick: (row: SurveyResponse) => string | null,
  options: readonly string[],
  opts: DistributionOptions = {}
): Distribution {
  const counts = new Map<string, number>()
  let answered = 0

  for (const row of rows) {
    const value = pick(row)
    if (!value) continue
    answered += 1
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  return build(counts, options, answered, rows.length, opts)
}

/**
 * Distribution of a multi-choice field. Shares are "% of people who answered",
 * so they add up to more than 100% — the page says so wherever one is shown.
 */
export function multiDistribution(
  rows: SurveyResponse[],
  pick: (row: SurveyResponse) => string[],
  options: readonly string[],
  opts: DistributionOptions = {}
): Distribution {
  const counts = new Map<string, number>()
  let answered = 0

  for (const row of rows) {
    const values = pick(row)
    if (values.length === 0) continue
    answered += 1
    // A duplicate inside one response must not count twice.
    for (const value of new Set(values)) {
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
  }

  return build(counts, options, answered, rows.length, opts)
}

// ── Responses over time ──────────────────────────────────────────────────────

export type DayPoint = { day: string; label: string; count: number }

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const labelFormatter = new Intl.DateTimeFormat('en-NZ', {
  // The keys below are already calendar dates, so they are formatted as-is.
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
})

/** yyyy-MM-dd in NZ time. */
function dayKey(date: Date): string {
  return dayFormatter.format(date)
}

/**
 * Walk the range as calendar dates rather than by adding 24h to a timestamp.
 * Stepping a real instant and re-formatting it in a distant zone shifts every
 * bucket by the UTC offset (NZ is +12/+13, so a UTC-midday cursor lands on the
 * following NZ day) and silently drops the first day's responses.
 */
function addDays(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function dayLabel(key: string): string {
  const [year, month, day] = key.split('-').map(Number)
  return labelFormatter.format(new Date(Date.UTC(year, month - 1, day)))
}

/**
 * One bucket per day from the first response to today, gaps included. Dropping
 * empty days would compress a quiet week into a straight line and hide it.
 */
export function responsesByDay(rows: SurveyResponse[]): DayPoint[] {
  if (rows.length === 0) return []

  const counts = new Map<string, number>()
  for (const row of rows) {
    const key = dayKey(new Date(row.createdAt))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const keys = [...counts.keys()].sort()
  const first = keys[0]
  const today = dayKey(new Date())
  // A clock skew shouldn't be able to cut the series short.
  const last = today < keys[keys.length - 1] ? keys[keys.length - 1] : today

  const points: DayPoint[] = []
  for (let key = first; key <= last; key = addDays(key, 1)) {
    points.push({ day: key, label: dayLabel(key), count: counts.get(key) ?? 0 })
    // A runaway range would be a bug, not data — cap it rather than hang.
    if (points.length >= 400) break
  }

  return points
}

export type TextCount = { label: string; count: number }

/**
 * Free text grouped case-insensitively, most common first — people type
 * "Retired" and "retired" and mean the same thing. The first spelling seen
 * wins the label.
 */
export function freeTextCounts(
  rows: SurveyResponse[],
  pick: (row: SurveyResponse) => string | null
): TextCount[] {
  const groups = new Map<string, TextCount>()

  for (const row of rows) {
    const raw = pick(row)?.trim()
    if (!raw) continue
    const key = raw.toLowerCase()
    const existing = groups.get(key)
    if (existing) existing.count += 1
    else groups.set(key, { label: raw, count: 1 })
  }

  return [...groups.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label)
  )
}

/**
 * When a question first got an answer. A question added after launch shows a
 * big "skipped" count that has nothing to do with willingness to answer — every
 * response older than the question counts as a skip — so the card says when it
 * started being asked instead of leaving that to be misread.
 */
export function firstAnsweredAt(
  rows: SurveyResponse[],
  pick: (row: SurveyResponse) => unknown
): Date | null {
  let earliest: number | null = null

  for (const row of rows) {
    const value = pick(row)
    if (value === null || value === undefined || value === '') continue
    const at = new Date(row.createdAt).getTime()
    if (!Number.isFinite(at)) continue
    if (earliest === null || at < earliest) earliest = at
  }

  return earliest === null ? null : new Date(earliest)
}

// ── Fetch ────────────────────────────────────────────────────────────────────

export type SurveyLoad =
  | { status: 'ok'; rows: SurveyResponse[] }
  | { status: 'unconfigured' }
  | { status: 'error'; message: string }

/**
 * Every response, newest first. There is no pagination here on purpose: the
 * whole point of the page is the shape of the full set, and PostgREST's default
 * ceiling is 1000 rows, so the range is asked for explicitly.
 */
export async function loadSurveyResponses(): Promise<SurveyLoad> {
  if (!surveyConfigured()) return { status: 'unconfigured' }

  try {
    const { data, error } = await surveyClient()
      .from('survey_responses')
      .select(COLUMNS)
      .order('created_at', { ascending: false })
      .range(0, 9999)

    if (error) {
      console.error('survey read failed', error)
      return { status: 'error', message: error.message }
    }

    const rows = ((data ?? []) as unknown as Row[]).map(
      (row): SurveyResponse => ({
        createdAt: row.created_at,
        area: row.area,
        topics: row.topics ?? [],
        occupation: row.occupation,
        education: row.education,
        ageRange: row.age_range,
        gender: row.gender,
        relationshipStatus: row.relationship_status,
        homeOwnership: row.home_ownership,
        homeValue: row.home_value,
        householdIncome: row.household_income,
        investments: row.investments,
        childrenAtHome: row.children_at_home,
        childrenAges: row.children_ages ?? [],
        pets: row.pets ?? [],
        hobby: row.hobby,
        hobbyOther: row.hobby_other,
        hasEmail: Boolean(row.email),
      })
    )

    return { status: 'ok', rows }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Unknown error'
    console.error('survey read threw', cause)
    return { status: 'error', message }
  }
}
