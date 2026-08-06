import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isValid } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const currency = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  maximumFractionDigits: 0,
})

const currencyPrecise = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatMoney(value: number, precise = false): string {
  const n = Number.isFinite(value) ? value : 0
  return precise ? currencyPrecise.format(n) : currency.format(n)
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  return isValid(d) ? format(d, 'd MMM yyyy') : '—'
}

export function formatDateShort(value: Date | string | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  return isValid(d) ? format(d, 'd MMM') : '—'
}

/** yyyy-MM-dd for <input type="date"> values. */
export function toDateInput(value: Date | string | null | undefined): string {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  return isValid(d) ? format(d, 'yyyy-MM-dd') : ''
}

export function formatPercent(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '0%'
  return `${(value * 100).toFixed(digits)}%`
}

/**
 * Parses a yyyy-MM-dd string as local midday. Midday avoids the off-by-one-day
 * that UTC-midnight parsing causes for timezones behind UTC.
 */
export function parseDateInput(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0)
}

/**
 * Parses a yyyy-MM-dd date and an optional HH:mm time into one Date, built
 * from the components so the stored instant matches the wall clock that was
 * typed rather than being shifted by the server's zone.
 *
 * An empty time lands on midnight, which the app reads as "no time given" —
 * see `hasTime()` in lib/events.ts.
 */
export function parseDateTimeInput(date: string, time?: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = (time && time.trim() !== '' ? time : '00:00').split(':').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0)
}

/** HH:mm for <input type="time">, blank at midnight. */
export function toTimeInput(value: Date | string | null | undefined): string {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  if (!isValid(d)) return ''
  if (d.getHours() === 0 && d.getMinutes() === 0) return ''
  return format(d, 'HH:mm')
}
