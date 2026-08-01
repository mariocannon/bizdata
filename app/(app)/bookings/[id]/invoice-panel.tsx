'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, ExternalLink, FileText, Mail, Receipt, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDate, formatMoney } from '@/lib/utils'
import { raiseInvoice, sendInvoiceEmail, voidInvoice } from '../actions'

export type InvoicePanelProps = {
  bookingId: string
  price: number // cents
  paid: string
  advertiserEmail: string | null
  invoiceUrl: string | null
  invoicePdfUrl: string | null
  invoicedAt: string | null
  paidAt: string | null
  hasInvoice: boolean
  /** Stripe configured in this deployment at all. */
  available: boolean
  testMode: boolean
  /** Why the booking can't be invoiced yet, from lib/invoicing. */
  blockedReason: string | null
}

export function InvoicePanel(props: InvoicePanelProps) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [confirmEmail, setConfirmEmail] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await action()
      if (result.ok) {
        toast.success(result.message ?? 'Done.')
        router.refresh()
      } else {
        toast.error(result.message ?? 'That did not work.')
      }
      setConfirmEmail(false)
    })
  }

  async function copyLink() {
    if (!props.invoiceUrl) return
    try {
      await navigator.clipboard.writeText(props.invoiceUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy — select the link and copy it manually.')
    }
  }

  if (!props.available) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="size-4" aria-hidden />
            Invoicing
          </CardTitle>
          <CardDescription>
            Stripe isn&apos;t configured for this deployment. Set{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">STRIPE_SECRET_KEY</code> to
            raise invoices from here.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="size-4" aria-hidden />
          Invoicing
          {props.testMode ? (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-900">
              Stripe test mode
            </span>
          ) : null}
        </CardTitle>
        <CardDescription>
          {props.hasInvoice
            ? `Invoiced ${formatDate(props.invoicedAt)} for ${formatMoney(props.price, true)}.`
            : `Raise a Stripe invoice for ${formatMoney(props.price, true)} once the ad has run.`}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {props.paid === 'PAID' && props.paidAt ? (
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <Check className="size-4" aria-hidden />
            Paid {formatDate(props.paidAt)}
          </p>
        ) : null}

        {!props.hasInvoice && props.blockedReason ? (
          <p className="text-sm text-muted-foreground">{props.blockedReason}</p>
        ) : null}

        {!props.hasInvoice ? (
          <div>
            <Button
              onClick={() => run(() => raiseInvoice(props.bookingId))}
              disabled={pending || Boolean(props.blockedReason)}
            >
              <Receipt />
              {pending ? 'Raising…' : 'Raise invoice'}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Creates the invoice and its payment link. Nothing is emailed to{' '}
              {props.advertiserEmail ?? 'the advertiser'} until you send it.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {props.invoiceUrl ? (
                <Button asChild variant="outline">
                  <a href={props.invoiceUrl} target="_blank" rel="noreferrer">
                    <ExternalLink />
                    Payment page
                  </a>
                </Button>
              ) : null}

              {props.invoicePdfUrl ? (
                <Button asChild variant="outline">
                  <a href={props.invoicePdfUrl} target="_blank" rel="noreferrer">
                    <FileText />
                    PDF
                  </a>
                </Button>
              ) : null}

              {props.invoiceUrl ? (
                <Button variant="outline" onClick={copyLink}>
                  {copied ? <Check /> : <Copy />}
                  {copied ? 'Copied' : 'Copy link'}
                </Button>
              ) : null}
            </div>

            {props.paid !== 'PAID' ? (
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                <Button
                  variant="outline"
                  onClick={() => setConfirmEmail(true)}
                  disabled={pending || !props.advertiserEmail}
                >
                  <Mail />
                  Email to advertiser
                </Button>
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => run(() => voidInvoice(props.bookingId))}
                  disabled={pending}
                >
                  <Undo2 />
                  Void invoice
                </Button>
              </div>
            ) : null}
          </>
        )}
      </CardContent>

      {/* Emailing reaches a real customer, so it asks first. */}
      <Dialog open={confirmEmail} onOpenChange={setConfirmEmail}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Email this invoice?</DialogTitle>
            <DialogDescription>
              Stripe will send the invoice for {formatMoney(props.price, true)} to{' '}
              <strong>{props.advertiserEmail}</strong>, with a link to pay it.
              {props.testMode
                ? ' This is a test-mode key, so Stripe will not deliver it to the real address.'
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmEmail(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              onClick={() => run(() => sendInvoiceEmail(props.bookingId))}
              disabled={pending}
            >
              {pending ? 'Sending…' : 'Send invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
