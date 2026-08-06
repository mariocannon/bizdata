'use client'

import { FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { beehiivFilename, toBeehiivHtml, type BeehiivListing } from '@/lib/beehiiv'

/**
 * Downloads the published listings as an HTML block to paste into beehiiv.
 * Shared by Classifieds and Events — the only differences are the heading,
 * the filename, and whether listings group by category.
 *
 * Rows arrive from the server already narrowed to Published and already
 * filtered, so what comes out is what the page is showing. `approvedCount` is
 * only used to explain an empty export — the usual reason for one is listings
 * still sitting at Approved.
 */
export function ExportBeehiivButton({
  listings,
  approvedCount,
  subtitle,
  title = 'Classifieds',
  filenameBase = 'the-tide-classifieds',
  groupByCategory = true,
  noun = 'listing',
  note,
}: {
  listings: BeehiivListing[]
  approvedCount: number
  subtitle?: string
  title?: string
  filenameBase?: string
  groupByCategory?: boolean
  /** What one row is called, for the messages. */
  noun?: string
  /** Appended to the success message — e.g. a warning about past events. */
  note?: string
}) {
  function handleExport() {
    if (listings.length === 0) {
      const stillApproved =
        approvedCount === 1
          ? 'One is still Approved — mark it Published to include it.'
          : `${approvedCount} are still Approved — mark them Published to include them.`

      toast.info(
        `No published ${noun}s in view.${approvedCount > 0 ? ` ${stillApproved}` : ''}`
      )
      return
    }

    const html = toBeehiivHtml(listings, { title, subtitle, groupByCategory })
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = beehiivFilename(filenameBase)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(
      `Exported ${listings.length} published ${
        listings.length === 1 ? noun : `${noun}s`
      } for beehiiv.${note ? ` ${note}` : ''}`
    )
  }

  return (
    <Button type="button" variant="outline" onClick={handleExport}>
      <FileDown />
      Export for beehiiv
    </Button>
  )
}
