/**
 * Classifieds are written to a fixed shape: a headline, a body of 50–70 words,
 * and a way to reach the person who placed it. The word range is the format —
 * short enough that several fit in one issue, long enough to say something —
 * so counting words lives here and is shared by the form (live counter) and
 * the server action (validation), the same way inventory rules are shared.
 */

export const CLASSIFIED_WORD_MIN = 50
export const CLASSIFIED_WORD_MAX = 70

/** Statuses where the word range is enforced rather than merely flagged. */
const ENFORCED_STATUSES = ['APPROVED', 'PUBLISHED']

export type WordCountState = 'empty' | 'short' | 'ok' | 'long'

/**
 * Whitespace-separated tokens that contain at least one letter or digit.
 * A lone dash or bullet isn't a word; "same-day" and "021 555 0142" count the
 * way a person reading the ad would count them.
 */
export function countWords(text: string | null | undefined): number {
  if (!text) return 0
  const trimmed = text.trim()
  if (trimmed === '') return 0
  return trimmed.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length
}

export function wordCountState(count: number): WordCountState {
  if (count === 0) return 'empty'
  if (count < CLASSIFIED_WORD_MIN) return 'short'
  if (count > CLASSIFIED_WORD_MAX) return 'long'
  return 'ok'
}

export function isWordCountValid(count: number): boolean {
  return wordCountState(count) === 'ok'
}

/**
 * Drafts are allowed to sit outside the range — copy arrives half-written and
 * gets cut down. Approving or publishing is what enforces it, mirroring how a
 * booking can be reserved over capacity but not confirmed over it.
 */
export function requiresWordCount(status: string): boolean {
  return ENFORCED_STATUSES.includes(status)
}

/** `"63 words"`, `"41 words — 9 under the 50-word minimum"`. */
export function wordCountMessage(count: number): string {
  const words = `${count} ${count === 1 ? 'word' : 'words'}`
  switch (wordCountState(count)) {
    case 'empty':
      return `No copy yet — ${CLASSIFIED_WORD_MIN}–${CLASSIFIED_WORD_MAX} words`
    case 'short':
      return `${words} — ${CLASSIFIED_WORD_MIN - count} under the ${CLASSIFIED_WORD_MIN}-word minimum`
    case 'long':
      return `${words} — ${count - CLASSIFIED_WORD_MAX} over the ${CLASSIFIED_WORD_MAX}-word maximum`
    default:
      return words
  }
}

/** The error shown when copy outside the range is approved or published. */
export function wordCountError(count: number, status: string): string {
  const target = `${CLASSIFIED_WORD_MIN}–${CLASSIFIED_WORD_MAX} words`
  const verb = status === 'PUBLISHED' ? 'Published' : 'Approved'
  return `${verb} classifieds must be ${target}. ${wordCountMessage(count)}.`
}

/** First `limit` words of the body, for list previews. */
export function excerpt(text: string | null | undefined, limit = 18): string {
  if (!text) return ''
  const words = text.trim().split(/\s+/)
  if (words.length <= limit) return words.join(' ')
  return `${words.slice(0, limit).join(' ')}…`
}
