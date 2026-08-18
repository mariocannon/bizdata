import { format, isValid } from 'date-fns'

/**
 * Event listings are classifieds with a date on them. The copy rules are
 * shared with lib/classifieds.ts — same word cap, same "flagged on drafts,
 * enforced on approval" shape — so everything here is about *when*.
 *
 * Midnight means "no time given". The form has a date field and an optional
 * time field, and leaving the time blank lands on 00:00, so a market that
 * simply runs "on Saturday" reads as a date rather than as 12am.
 */

export const EVENT_WORD_MAX = 70

// The featured upgrade is not an events idea — a classified carries the same
// one — so its price and its arithmetic live in lib/featured.ts.

/** Statuses where the word cap is enforced rather than merely flagged. */
const ENFORCED_STATUSES = ['APPROVED', 'PUBLISHED']

export function requiresWordCount(status: string): boolean {
  return ENFORCED_STATUSES.includes(status)
}

/** False at exactly midnight, which the form uses to mean "no time". */
export function hasTime(value: Date): boolean {
  return isValid(value) && !(value.getHours() === 0 && value.getMinutes() === 0)
}

/** `10am`, `2:30pm` — lowercase, and no `:00` when it's on the hour. */
export function formatTime(value: Date): string {
  return value.getMinutes() === 0 ? format(value, 'haaa') : format(value, 'h:mmaaa')
}

function formatDay(value: Date, year = true): string {
  return format(value, year ? 'EEE d MMM yyyy' : 'EEE d MMM')
}

function sameDay(a: Date, b: Date): boolean {
  return format(a, 'yyyy-MM-dd') === format(b, 'yyyy-MM-dd')
}

/**
 * The one line that says when something is on:
 *
 *   Sat 15 Aug 2026                       — date only
 *   Sat 15 Aug 2026, 10am                 — with a start time
 *   Sat 15 Aug 2026, 10am – 2pm           — same day, both times
 *   Sat 15 Aug 2026 – Sun 16 Aug 2026     — runs across days
 */
export function formatEventWhen(
  startsAt: Date | null | undefined,
  endsAt?: Date | null,
  /** The table drops the year to keep the column narrow; the export keeps it. */
  options: { year?: boolean } = {}
): string {
  if (!startsAt || !isValid(startsAt)) return '—'
  const year = options.year ?? true

  const start = hasTime(startsAt)
    ? `${formatDay(startsAt, year)}, ${formatTime(startsAt)}`
    : formatDay(startsAt, year)

  if (!endsAt || !isValid(endsAt)) return start

  if (sameDay(startsAt, endsAt)) {
    // Only the time is worth repeating on the same day.
    return hasTime(endsAt) ? `${start} – ${formatTime(endsAt)}` : start
  }

  const end = hasTime(endsAt)
    ? `${formatDay(endsAt, year)}, ${formatTime(endsAt)}`
    : formatDay(endsAt, year)

  return `${start} – ${end}`
}

/**
 * An event is over once its end has passed — or its start, when no end was
 * given. A one-off on Saturday shouldn't drop out of "upcoming" at 12:01am on
 * the day it runs, so a date-only event counts as upcoming all day.
 */
export function isUpcoming(
  startsAt: Date,
  endsAt: Date | null | undefined,
  now = new Date()
): boolean {
  const finishes = endsAt && isValid(endsAt) ? endsAt : startsAt
  if (!hasTime(finishes)) {
    // Date-only: upcoming until the end of that day.
    const endOfDay = new Date(finishes)
    endOfDay.setHours(23, 59, 59, 999)
    return endOfDay >= now
  }
  return finishes >= now
}

/** `Sat 15 Aug 2026, 10am · Ōrewa Community Hall` for lists and the export. */
export function eventMeta(
  startsAt: Date,
  endsAt: Date | null | undefined,
  location: string | null | undefined
): string {
  const when = formatEventWhen(startsAt, endsAt)
  return location ? `${when} · ${location}` : when
}

/**
 * Whether the automatic sweep should archive this listing: it has been and
 * gone, and it isn't archived already.
 *
 * An event is only ever interesting until it happens, so once it's over it goes
 * where a run classified goes — Archived, still there, out of the way. It uses
 * the same `isUpcoming` rule the list dims rows with, so a date-only Saturday
 * market survives its own day rather than archiving itself at 12:01am on the
 * morning it runs.
 *
 * Every other status sweeps: a draft nobody approved and an approved listing
 * that never made an issue are as finished as one that ran.
 */
export function shouldAutoArchive(
  event: { startsAt: Date; endsAt?: Date | null; status: string },
  now = new Date()
): boolean {
  if (event.status === 'ARCHIVED') return false
  return !isUpcoming(event.startsAt, event.endsAt, now)
}
