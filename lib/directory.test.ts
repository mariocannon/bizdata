import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DIRECTORY_LISTING_CAP,
  checkDirectoryCapacity,
  othersToUnfeature,
} from './directory'
import type { DirectoryListingLike } from './directory'

function listing(
  id: string,
  category = 'cafes',
  featured = false
): DirectoryListingLike {
  return { id, category, featured }
}

describe('checkDirectoryCapacity', () => {
  it('allows an add when the category is under the cap', () => {
    const nine = Array.from({ length: 9 }, (_, i) => listing(`c${i}`))
    assert.equal(checkDirectoryCapacity(nine, { category: 'cafes' }).ok, true)
  })

  it('rejects an add that would push a category over the cap', () => {
    const ten = Array.from({ length: DIRECTORY_LISTING_CAP }, (_, i) => listing(`c${i}`))
    const result = checkDirectoryCapacity(ten, { category: 'cafes' })
    assert.equal(result.ok, false)
    assert.match(result.reason ?? '', /already has 10 listings/i)
  })

  it('does not silently truncate — it never returns ok with a note, only a hard reject', () => {
    const ten = Array.from({ length: DIRECTORY_LISTING_CAP }, (_, i) => listing(`c${i}`))
    const result = checkDirectoryCapacity(ten, { category: 'cafes' })
    assert.equal(result.ok, false)
  })

  it('excludes the row being edited from its own count', () => {
    const ten = Array.from({ length: DIRECTORY_LISTING_CAP }, (_, i) => listing(`c${i}`))
    // Editing one of the ten rows already in the category (not changing
    // category) must not count itself as an eleventh listing.
    const result = checkDirectoryCapacity(ten, { id: 'c0', category: 'cafes' })
    assert.equal(result.ok, true)
  })

  it('counts only the target category, so a full category elsewhere does not block this one', () => {
    const tenPlumbers = Array.from({ length: DIRECTORY_LISTING_CAP }, (_, i) =>
      listing(`p${i}`, 'plumbers')
    )
    const result = checkDirectoryCapacity(tenPlumbers, { category: 'cafes' })
    assert.equal(result.ok, true)
  })

  it('blocks an edit that moves a listing into an already-full category', () => {
    const tenCafes = Array.from({ length: DIRECTORY_LISTING_CAP }, (_, i) => listing(`c${i}`))
    // "e1" already exists (in a different category) and is being edited to
    // move into "cafes", which is already at the cap.
    const existing = [...tenCafes, listing('e1', 'plumbers')]
    const result = checkDirectoryCapacity(existing, { id: 'e1', category: 'cafes' })
    assert.equal(result.ok, false)
  })

  it('respects a custom cap', () => {
    const three = Array.from({ length: 3 }, (_, i) => listing(`c${i}`))
    assert.equal(checkDirectoryCapacity(three, { category: 'cafes' }, 3).ok, false)
    assert.equal(checkDirectoryCapacity(three, { category: 'cafes' }, 4).ok, true)
  })
})

describe('othersToUnfeature', () => {
  it('unsets every other featured listing in the same category', () => {
    const existing = [
      listing('a', 'cafes', true),
      listing('b', 'cafes', false),
      listing('c', 'cafes', true),
    ]
    const ids = othersToUnfeature(existing, { id: 'd', category: 'cafes' })
    assert.deepEqual(ids.sort(), ['a', 'c'])
  })

  it('excludes the candidate itself, even if it is already marked featured', () => {
    const existing = [listing('a', 'cafes', true), listing('b', 'cafes', true)]
    const ids = othersToUnfeature(existing, { id: 'a', category: 'cafes' })
    assert.deepEqual(ids, ['b'])
  })

  it('never touches another category', () => {
    const existing = [listing('a', 'cafes', true), listing('b', 'plumbers', true)]
    const ids = othersToUnfeature(existing, { id: 'c', category: 'cafes' })
    assert.deepEqual(ids, ['a'])
  })

  it('returns nothing when no other listing in the category is featured', () => {
    const existing = [listing('a', 'cafes', false), listing('b', 'cafes', false)]
    assert.deepEqual(othersToUnfeature(existing, { id: 'c', category: 'cafes' }), [])
  })

  it('setting featured=true on one listing leaves at most one featured per category', () => {
    // Simulates what the transaction in saveDirectoryListing does: unset the
    // ids this returns, then write the candidate as featured. Two sequential
    // saves can never leave two listings featured at once because the unset
    // and the write happen inside one transaction.
    let existing = [
      listing('a', 'cafes', true),
      listing('b', 'cafes', false),
      listing('c', 'cafes', false),
    ]
    const toUnfeature = othersToUnfeature(existing, { id: 'b', category: 'cafes' })
    existing = existing.map((row) =>
      toUnfeature.includes(row.id as string)
        ? { ...row, featured: false }
        : row.id === 'b'
          ? { ...row, featured: true }
          : row
    )
    const featuredCount = existing.filter((row) => row.category === 'cafes' && row.featured).length
    assert.equal(featuredCount, 1)
    assert.equal(existing.find((row) => row.id === 'b')?.featured, true)
  })
})
