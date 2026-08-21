/**
 * The survey's option lists, exactly as the CHECK constraints on
 * `survey_responses` spell them.
 *
 * They sit in their own module because two things need them and only one of
 * those things may touch a database: `lib/survey.ts` is `server-only` and reads
 * the survey project, while `lib/media-kit.ts` is pure and groups these same
 * strings into the bands the public media kit publishes. Keeping the strings
 * here means the grouping is checked against the real options rather than
 * against a copy of them that can drift — `lib/media-kit.test.ts` asserts every
 * option lands in exactly one band.
 *
 * `lib/survey.ts` re-exports everything below, so `@/lib/survey` remains the
 * import for anything already reading the survey.
 */

export const AREAS = [
  'Puhoi', 'Waiwera', 'Hatfields Beach', 'Ōrewa', 'Wainui', 'Millwater',
  'Silverdale', 'Red Beach', 'Whangaparāoa', 'Stanmore Bay', 'Tindalls Beach',
  'Matakatia', 'Arkles Bay', 'Little Manly', 'Manly', 'Army Bay', 'Gulf Harbour',
  'Stillwater', 'Dairy Flat', 'Ōkura', 'None of the above',
] as const

export const TOPICS = [
  'Event coverage', 'Restaurant news', 'Government updates', 'School news',
  'Real estate',
] as const

export const AGE_RANGES = [
  'Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65-74', '75+',
  'Prefer not to say',
] as const

export const GENDERS = ['Female', 'Male', 'Prefer not to say'] as const

export const EDUCATION = [
  'Did not finish high school',
  'Finished high school (NCEA Level 2 or 3)',
  'Certificate or trade qualification (Levels 1-4)',
  'Diploma or advanced diploma',
  'Bachelor degree',
  'Master degree',
  'Professional degree (MD, JD, etc.)',
  'Doctorate (PhD, EdD, etc.)',
  'Prefer not to say',
] as const

export const RELATIONSHIP_STATUSES = [
  'Single', 'In a relationship', 'Engaged', 'Married', 'Separated', 'Divorced',
  'Widowed', 'Prefer not to say',
] as const

export const HOME_OWNERSHIP = [
  'I own my home', 'I own my home and am moving soon', 'I own more than one home',
  'I rent my home', 'I rent my home and am moving soon', 'Other',
  'Prefer not to say',
] as const

export const HOME_VALUES = [
  'Under $600,000', '$600,000-$799,999', '$800,000-$999,999', '$1M-$1.24M',
  '$1.25M-$1.49M', '$1.5M-$1.99M', '$2M-$2.99M', 'Over $3 million',
  'Not sure or prefer not to say',
] as const

export const HOUSEHOLD_INCOMES = [
  'Under $50,000', '$50,000-$74,999', '$75,000-$99,999', '$100,000-$149,999',
  '$150,000-$199,999', '$200,000-$299,999', '$300,000-$499,999',
  '$500,000-$749,999', '$750,000-$999,999', 'Over $1 million',
  'Prefer not to say',
] as const

export const INVESTMENTS = [
  'Under $100,000', '$100,000-$249,999', '$250,000-$499,999', '$500,000-$999,999',
  '$1M-$2.9M', '$3M-$4.9M', '$5M-$9.9M', 'Over $10 million', 'I am not sure',
  'Prefer not to say',
] as const

export const CHILDREN_AT_HOME = ['Yes', 'No', 'Prefer not to say'] as const

export const CHILDREN_AGES = [
  '0-2', '3-5', '6-10', '11-13', '14-18', '18+ living at home',
  'Prefer not to say',
] as const

/**
 * Single-choice, unlike topics and pets — readers pick the one hobby, and
 * `hobby_other` carries the write-in when they pick "Other".
 */
export const HOBBIES = [
  'Gardening', 'Exercising (gym, running, yoga)', 'Golf', 'Fishing or boating',
  'Walking or hiking', 'Cooking or baking', 'Reading', 'Travel',
  'DIY and home projects', 'Photography, art or craft', 'Other',
] as const

export const PETS = [
  'I do not have pets', 'Yes, a dog or dogs', 'Yes, a cat or cats', 'Yes, fish',
  'Yes, a bird or birds', 'Yes, a reptile or reptiles',
  'Yes, a small mammal (guinea pig, rabbit, etc.)', 'Other',
] as const

/**
 * Answers that carry no signal. They stay in the survey's own charts — dropping
 * them would inflate every other share — but they're drawn in the de-emphasis
 * grey and sorted last so they never read as the headline. The media kit leaves
 * them out of its denominators entirely and says so on the page.
 */
const NON_ANSWERS = new Set<string>([
  'Prefer not to say',
  'Not sure or prefer not to say',
  'I am not sure',
])

export function isNonAnswer(option: string): boolean {
  return NON_ANSWERS.has(option)
}
