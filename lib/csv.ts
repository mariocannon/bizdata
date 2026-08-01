/**
 * One reusable CSV export helper, used by every list page.
 * Column sets mirror the source data so a later import into a dedicated tool
 * (Sponsy or similar) is painless — nothing is lost in the round trip.
 */

export type CsvColumn<T> = {
  /** Header text written to the file. */
  header: string
  /** Cell value for a row. Return null/undefined for blank. */
  value: (row: T) => string | number | boolean | Date | null | undefined
}

function escapeCell(raw: string | number | boolean | Date | null | undefined): string {
  if (raw === null || raw === undefined) return ''

  let value: string
  if (raw instanceof Date) {
    value = Number.isNaN(raw.getTime()) ? '' : raw.toISOString().slice(0, 10)
  } else if (typeof raw === 'boolean') {
    value = raw ? 'Yes' : 'No'
  } else {
    value = String(raw)
  }

  // Quote when the value contains a delimiter, quote or newline; double up
  // any embedded quotes per RFC 4180.
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** Builds the CSV text for a set of rows. Exported for testing/reuse. */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [columns.map((c) => escapeCell(c.header)).join(',')]
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCell(c.value(row))).join(','))
  }
  return lines.join('\r\n')
}

/** Builds the CSV and triggers a browser download. */
export function exportCsv<T>(rows: T[], columns: CsvColumn<T>[], filename: string): void {
  const csv = toCsv(rows, columns)
  // The BOM keeps Excel happy with the em dashes in issue titles.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** `advertisers-2025-08-14.csv` */
export function timestampedFilename(base: string): string {
  return `${base}-${new Date().toISOString().slice(0, 10)}.csv`
}
