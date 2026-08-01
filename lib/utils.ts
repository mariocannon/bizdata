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
