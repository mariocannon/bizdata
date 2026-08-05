import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CLASSIFIED_WORD_MAX,
  CLASSIFIED_WORD_MIN,
  countWords,
  excerpt,
  isWordCountValid,
  requiresWordCount,
  wordCountMessage,
  wordCountState,
} from './classifieds'

/** A body of exactly `n` words. */
function body(n: number): string {
  return Array.from({ length: n }, (_, i) => `word${i + 1}`).join(' ')
}

describe('countWords', () => {
  it('is 0 for empty, blank and missing copy', () => {
    assert.equal(countWords(''), 0)
    assert.equal(countWords('   \n  '), 0)
    assert.equal(countWords(null), 0)
    assert.equal(countWords(undefined), 0)
  })

  it('collapses runs of whitespace and newlines', () => {
    assert.equal(countWords('  one   two \n\n three  '), 3)
  })

  it('counts a hyphenated word once', () => {
    assert.equal(countWords('same-day callouts'), 2)
  })

  it('counts numbers and phone numbers as words', () => {
    assert.equal(countWords('Call 021 555 0142'), 4)
  })

  it('ignores punctuation that stands alone', () => {
    // An em dash between clauses is not a word of ad copy.
    assert.equal(countWords('Boat for sale — tidy'), 4)
    assert.equal(countWords('• • •'), 0)
  })

  it('counts macronised and accented words', () => {
    assert.equal(countWords('Ōrewa to Waiwera'), 3)
  })
})

describe('wordCountState', () => {
  it('flags copy under the minimum', () => {
    assert.equal(wordCountState(countWords(body(CLASSIFIED_WORD_MIN - 1))), 'short')
  })

  it('accepts both ends of the range', () => {
    assert.equal(wordCountState(countWords(body(CLASSIFIED_WORD_MIN))), 'ok')
    assert.equal(wordCountState(countWords(body(CLASSIFIED_WORD_MAX))), 'ok')
    assert.equal(isWordCountValid(countWords(body(60))), true)
  })

  it('flags copy over the maximum', () => {
    assert.equal(wordCountState(countWords(body(CLASSIFIED_WORD_MAX + 1))), 'long')
    assert.equal(isWordCountValid(CLASSIFIED_WORD_MAX + 1), false)
  })

  it('separates "nothing written" from "too short"', () => {
    assert.equal(wordCountState(0), 'empty')
  })
})

describe('requiresWordCount', () => {
  it('enforces the range on approved and published listings', () => {
    assert.equal(requiresWordCount('APPROVED'), true)
    assert.equal(requiresWordCount('PUBLISHED'), true)
  })

  it('lets drafts and archived listings sit outside it', () => {
    assert.equal(requiresWordCount('DRAFT'), false)
    assert.equal(requiresWordCount('ARCHIVED'), false)
  })
})

describe('wordCountMessage', () => {
  it('names the shortfall', () => {
    assert.match(wordCountMessage(41), /9 under/)
  })

  it('names the overrun', () => {
    assert.match(wordCountMessage(74), /4 over/)
  })

  it('just states the count when in range', () => {
    assert.equal(wordCountMessage(63), '63 words')
  })

  it('uses the singular for one word', () => {
    assert.match(wordCountMessage(1), /^1 word /)
  })
})

describe('excerpt', () => {
  it('returns short copy unchanged', () => {
    assert.equal(excerpt('Boat for sale', 18), 'Boat for sale')
  })

  it('truncates longer copy with an ellipsis', () => {
    const result = excerpt(body(30), 5)
    assert.equal(result, 'word1 word2 word3 word4 word5…')
  })

  it('handles missing copy', () => {
    assert.equal(excerpt(null), '')
  })
})
