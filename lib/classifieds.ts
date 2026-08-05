/**
 * Classifieds are written to a fixed shape: a headline, a short body, and a way
 * to reach the person who placed it. The length cap is the format — several
 * listings have to fit in one issue — so counting words lives here and is
 * shared by the form (live counter) and the server action (validation), the
 * same way inventory rules are shared.
 *
 * There is no lower bound. A listing that says what it needs to in ten words is
 * a good listing.
 */

export const CLASSIFIED_WORD_MAX = 70

/** Statuses where the word cap is enforced rather than merely flagged. */
const ENFORCED_STATUSES = ['APPROVED', 'PUBLISHED']

export type WordCountState = 'empty' | 'ok' | 'long'

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
  if (count > CLASSIFIED_WORD_MAX) return 'long'
  return 'ok'
}

export function isWordCountValid(count: number): boolean {
  return wordCountState(count) === 'ok'
}

/**
 * Drafts are allowed to run long — copy arrives overwritten and gets cut down.
 * Approving or publishing is what enforces the cap, mirroring how a booking can
 * be reserved over capacity but not confirmed over it.
 */
export function requiresWordCount(status: string): boolean {
  return ENFORCED_STATUSES.includes(status)
}

/** `"63 words"`, `"74 words — 4 over the 70-word maximum"`. */
export function wordCountMessage(count: number): string {
  const words = `${count} ${count === 1 ? 'word' : 'words'}`
  switch (wordCountState(count)) {
    case 'empty':
      return `No copy yet — up to ${CLASSIFIED_WORD_MAX} words`
    case 'long':
      return `${words} — ${count - CLASSIFIED_WORD_MAX} over the ${CLASSIFIED_WORD_MAX}-word maximum`
    default:
      return words
  }
}

/** The error shown when over-long copy is approved or published. */
export function wordCountError(count: number, status: string): string {
  const verb = status === 'PUBLISHED' ? 'Published' : 'Approved'
  return `${verb} classifieds run to ${CLASSIFIED_WORD_MAX} words at most. ${wordCountMessage(count)}.`
}

/** First `limit` words of the body, for list previews. */
export function excerpt(text: string | null | undefined, limit = 18): string {
  if (!text) return ''
  const words = text.trim().split(/\s+/)
  if (words.length <= limit) return words.join(' ')
  return `${words.slice(0, limit).join(' ')}…`
}
