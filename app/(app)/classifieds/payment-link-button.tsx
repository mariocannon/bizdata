'use client'

import * as React from 'react'
import { Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

/**
 * The Stripe Payment Link for one featured classified, tagged with that
 * listing's id. Two things to do with it, so two controls:
 *
 *   - **Pay link** opens the payment page in a new tab, which is how you check
 *     the link is live and what the submitter is about to see.
 *   - **Copy** puts the URL on the clipboard, for the email that chases the
 *     fee. Nothing in this app sends mail, and you are already writing to the
 *     submitter to confirm the issue — the link goes in that email.
 *
 * They were one button to begin with, which copied silently: clicking it looked
 * like nothing happening, because the thing you expect from a payment link is a
 * payment page.
 */
export function PaymentLinkButton({
  url,
  headline,
  compact = false,
}: {
  url: string
  headline: string
  /** Icons only, for the table's action column where space is tight. */
  compact?: boolean
}) {
  async function handleCopy() {
    try {
      // `navigator.clipboard` needs a secure context and can be refused
      // outright, so a failure shows the URL rather than doing nothing.
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
        aria-label={`Open the payment page for ${headline}`}
        title="Open the payment page"
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ExternalLink className="size-3.5" />
        {compact ? null : 'Pay link'}
      </a>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Copy the payment link for ${headline}`}
        title="Copy the payment link"
        className="inline-flex items-center rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Copy className="size-3.5" />
      </button>
    </span>
  )
}
