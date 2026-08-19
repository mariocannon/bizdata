'use client'

import * as React from 'react'
import { Link2 } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Copies the Stripe Payment Link for one featured classified, tagged with that
 * listing's id, so it can be pasted into the email that chases the fee.
 *
 * A copy button rather than a "send" one: nothing in this app sends mail, and
 * the operator is already writing to the submitter to confirm the issue. The
 * link goes in that email.
 *
 * `navigator.clipboard` needs a secure context and can be refused outright, so
 * a failure falls back to showing the URL rather than silently doing nothing.
 */
export function PaymentLinkButton({
  url,
  headline,
  compact = false,
}: {
  url: string
  headline: string
  /** Icon only, for the table's action column where space is tight. */
  compact?: boolean
}) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Payment link copied.')
    } catch {
      toast.error('Could not copy it — the link is ' + url)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy the payment link for ${headline}`}
      title="Copy the payment link"
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <Link2 className="size-3.5" />
      {compact ? null : 'Pay link'}
    </button>
  )
}
