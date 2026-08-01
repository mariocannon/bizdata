'use client'

import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { exportCsv, timestampedFilename, type CsvColumn } from '@/lib/csv'

export type CsvCell = string | number | boolean | null
export type CsvRow = Record<string, CsvCell>

/**
 * Rows arrive from the server already flattened (derived totals included), so
 * the column set is plain `{ header, key }` data and crosses the server/client
 * boundary without any functions.
 */
export function ExportCsvButton({
  rows,
  columns,
  filename,
  label = 'Export CSV',
  variant = 'outline',
  size = 'default',
}: {
  rows: CsvRow[]
  columns: { header: string; key: string }[]
  filename: string
  label?: string
  variant?: 'outline' | 'ghost' | 'secondary' | 'default'
  size?: 'default' | 'sm'
}) {
  function handleExport() {
    if (rows.length === 0) {
      toast.info('Nothing to export yet.')
      return
    }

    const csvColumns: CsvColumn<CsvRow>[] = columns.map((column) => ({
      header: column.header,
      value: (row) => row[column.key],
    }))

    exportCsv(rows, csvColumns, timestampedFilename(filename))
    toast.success(`Exported ${rows.length} ${rows.length === 1 ? 'row' : 'rows'}.`)
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={handleExport}>
      <Download />
      {label}
    </Button>
  )
}
