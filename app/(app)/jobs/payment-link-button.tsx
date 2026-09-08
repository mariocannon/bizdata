'use client'

import * as React from 'react'
import { Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

/**
 * The Stripe Payment Link for one job listing, tagged with that listing's id.
 * Near-verbatim clone of the featured-classified control — two things to do
 * with the link, so two controls:
 *
 *   - **Pay link** opens the payment page in a new tab, to check the link is
 *     live and see what the employer is about to see.
 *   - **Copy** puts the URL on the clipboard, for the email that confirms the
 *     issue and chases the fee.
 */
export function PaymentLinkButton({
  url,
  title,
  compact = false,
}: {
  url: string
  title: string
  /** Icons only, for the table's action column where space is tight. */
  compact?: boolean
}) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Payment link copied.')
    } catch {
      toast.error(`Could not copy it — the link is ${url}`)
    }
  }

  return (
    <span className="inline-flex items-center gap-0.5">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open the payment page for ${title}`}
        title="Open the payment page"
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ExternalLink className="size-3.5" />
        {compact ? null : 'Pay link'}
      </a>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Copy the payment link for ${title}`}
        title="Copy the payment link"
        className="inline-flex items-center rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Copy className="size-3.5" />
      </button>
    </span>
  )
}
