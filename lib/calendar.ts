import { parse, startOfMonth } from 'date-fns'

/**
 * Calendar URL state. This lives outside the calendar component because server
 * components read it too, and a `'use client'` module can only export
 * components across the boundary — not callable helpers.
 */
export const MONTH_PARAM = 'month'

/** Parses `?month=yyyy-MM`, falling back to the current month. */
export function monthFromParam(value: string | undefined): Date {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const parsed = parse(value, 'yyyy-MM', new Date())
    if (!Number.isNaN(parsed.getTime())) return startOfMonth(parsed)
  }
  return startOfMonth(new Date())
}
