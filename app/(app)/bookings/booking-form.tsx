'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ImageOff, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Field } from '@/components/ui/field'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AD_TYPES,
  BOOKING_STATUSES,
  PAID_STATUSES,
  SECTION_SLOTS,
  label,
} from '@/lib/enums'
import { formatDate, formatMoney } from '@/lib/utils'
import { centsToInput } from '@/lib/money'
import { saveBooking, previewCapacity } from './actions'

export type BookingFormValues = {
  id: string
  label: string
  advertiserId: string
  issueId: string
  adType: string
  section: string
  price: string
  status: string
  paid: string
  ctaUrl: string
  copy: string
  creativeUrl: string
  notes: string
}

export type AdvertiserOption = { id: string; name: string }
export type IssueOption = { id: string; title: string; publishDate: string }

export function BookingForm({
  booking,
  advertisers,
  issues,
  defaultPrices,
}: {
  booking?: BookingFormValues
  advertisers: AdvertiserOption[]
  issues: IssueOption[]
  defaultPrices: Record<string, number>
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const editing = Boolean(booking?.id)

  const [adType, setAdType] = React.useState(booking?.adType ?? 'HEADLINE')
  const [section, setSection] = React.useState(booking?.section ?? 'WEATHER')
  const [issueId, setIssueId] = React.useState(booking?.issueId ?? issues[0]?.id ?? '')
  const [status, setStatus] = React.useState(booking?.status ?? 'RESERVED')
  // Held as the dollars string the operator types; converted to cents on save.
  const [price, setPrice] = React.useState(
    booking?.price ?? centsToInput(defaultPrices[booking?.adType ?? 'HEADLINE'] ?? 0)
  )
  const [priceTouched, setPriceTouched] = React.useState(editing)
  const [creativeUrl, setCreativeUrl] = React.useState(booking?.creativeUrl ?? '')
  const [preview, setPreview] = React.useState<string | null>(booking?.creativeUrl || null)
  const [conflict, setConflict] = React.useState<string | null>(null)

  const needsSection = adType === 'SECTION_SPONSOR'

  // Saving navigates from /bookings/new to /bookings/[id] with this same form
  // mounted, so the stored creative has to replace the local object-URL preview
  // rather than leaving the pre-upload blob on screen.
  const storedCreative = booking?.creativeUrl ?? ''
  React.useEffect(() => {
    setCreativeUrl(storedCreative)
    setPreview(storedCreative || null)
  }, [booking?.id, storedCreative])

  // Object URLs are only valid until revoked; drop the last one whenever the
  // preview moves on so repeated picks don't leak.
  React.useEffect(() => {
    if (!preview?.startsWith('blob:')) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  function handleAdTypeChange(next: string) {
    setAdType(next)
    // Only pre-fill the price while the operator hasn't set one themselves.
    if (!priceTouched) setPrice(centsToInput(defaultPrices[next] ?? 0))
  }

  // Live inventory check — shows the conflict before the operator hits save.
  React.useEffect(() => {
    let cancelled = false
    if (!issueId || !adType) return

    previewCapacity({
      id: booking?.id,
      issueId,
      adType,
      section: needsSection ? section : null,
    })
      .then((result) => {
        if (!cancelled) setConflict(result.ok ? null : (result.reason ?? null))
      })
      .catch(() => {
        if (!cancelled) setConflict(null)
      })

    return () => {
      cancelled = true
    }
  }, [issueId, adType, section, needsSection, booking?.id])

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]
    if (!selected) {
      setPreview(creativeUrl || null)
      return
    }
    const objectUrl = URL.createObjectURL(selected)
    setPreview(objectUrl)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await saveBooking(form)

      if (result.ok) {
        setErrors({})
        if (result.data?.warning) {
          toast.warning(result.data.warning, { duration: 8000 })
        } else {
          toast.success(result.message ?? 'Saved.')
        }
        router.push(`/bookings/${result.data?.id ?? ''}`)
        router.refresh()
      } else {
        setErrors(result.errors ?? {})
        toast.error(result.message)
      }
    })
  }

  const blocking = conflict !== null && (status === 'CONFIRMED' || status === 'RAN')

  if (advertisers.length === 0 || issues.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm">
          <p className="mb-3 font-medium">You need one of each before you can book.</p>
          <div className="flex flex-wrap gap-2">
            {advertisers.length === 0 ? (
              <Button asChild variant="outline">
                <Link href="/advertisers">Add an advertiser</Link>
              </Button>
            ) : null}
            {issues.length === 0 ? (
              <Button asChild variant="outline">
                <Link href="/issues">Add an issue</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-3">
      {booking?.id ? <input type="hidden" name="id" value={booking.id} /> : null}
      <input type="hidden" name="creativeUrl" value={creativeUrl} />

      <div className="flex flex-col gap-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>The slot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Advertiser" htmlFor="advertiserId" required error={errors.advertiserId}>
              <Select
                id="advertiserId"
                name="advertiserId"
                defaultValue={booking?.advertiserId ?? advertisers[0]?.id}
                required
              >
                {advertisers.map((advertiser) => (
                  <option key={advertiser.id} value={advertiser.id}>
                    {advertiser.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Issue" htmlFor="issueId" required error={errors.issueId}>
              <Select
                id="issueId"
                name="issueId"
                value={issueId}
                onChange={(event) => setIssueId(event.target.value)}
                required
              >
                {issues.map((issue) => (
                  <option key={issue.id} value={issue.id}>
                    {issue.title}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Ad type" htmlFor="adType" required error={errors.adType}>
              <Select
                id="adType"
                name="adType"
                value={adType}
                onChange={(event) => handleAdTypeChange(event.target.value)}
                required
              >
                {AD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {label(type)}
                  </option>
                ))}
              </Select>
            </Field>

            {/* Section only exists for Section Sponsor bookings. */}
            {needsSection ? (
              <Field label="Section" htmlFor="section" required error={errors.section}>
                <Select
                  id="section"
                  name="section"
                  value={section}
                  onChange={(event) => setSection(event.target.value)}
                  required
                >
                  {SECTION_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {label(slot)}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : (
              <input type="hidden" name="section" value="" />
            )}

            <Field
              label="Price"
              htmlFor="price"
              error={errors.price}
              hint={`Default for ${label(adType)}: ${formatMoney(defaultPrices[adType] ?? 0)}`}
            >
              <Input
                id="price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={price}
                onChange={(event) => {
                  setPrice(event.target.value)
                  setPriceTouched(true)
                }}
                aria-invalid={Boolean(errors.price)}
              />
            </Field>

            <Field label="Booking status" htmlFor="status" required error={errors.status}>
              <Select
                id="status"
                name="status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                required
              >
                {BOOKING_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {label(option)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Payment" htmlFor="paid" required error={errors.paid}>
              <Select id="paid" name="paid" defaultValue={booking?.paid ?? 'UNPAID'} required>
                {PAID_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {label(option)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Label"
              htmlFor="label"
              error={errors.label}
              hint="Leave blank to generate one automatically."
              className="sm:col-span-2"
            >
              <Input
                id="label"
                name="label"
                defaultValue={booking?.label ?? ''}
                placeholder="Example Realty – Headline – 14 Aug"
              />
            </Field>
          </CardContent>
        </Card>

        {conflict ? (
          <div
            className={
              'flex items-start gap-2.5 rounded-lg border p-3 text-sm ' +
              (blocking
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-amber-200 bg-amber-50 text-amber-900')
            }
            role="status"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">
                {blocking ? 'This would oversell the issue' : 'Heads up — this oversells the issue'}
              </p>
              <p className="mt-0.5">{conflict}</p>
              {!blocking ? (
                <p className="mt-1 text-xs">
                  A reservation can still be saved; the issue will be flagged oversold. Only
                  Confirmed and Ran bookings are blocked.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Ad content</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label="CTA URL" htmlFor="ctaUrl" error={errors.ctaUrl}>
              <Input
                id="ctaUrl"
                name="ctaUrl"
                inputMode="url"
                placeholder="https://"
                defaultValue={booking?.ctaUrl ?? ''}
                aria-invalid={Boolean(errors.ctaUrl)}
              />
            </Field>

            <Field label="Ad copy" htmlFor="copy" error={errors.copy}>
              <Textarea
                id="copy"
                name="copy"
                rows={5}
                defaultValue={booking?.copy ?? ''}
                placeholder="The words that run in the newsletter."
              />
            </Field>

            <Field label="Internal notes" htmlFor="notes" error={errors.notes}>
              <Textarea id="notes" name="notes" rows={2} defaultValue={booking?.notes ?? ''} />
            </Field>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Creative</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Creative preview"
                className="w-full rounded border border-border bg-muted object-contain"
              />
            ) : (
              <div className="flex h-32 flex-col items-center justify-center gap-1.5 rounded border border-dashed border-border bg-muted/40 text-xs text-muted-foreground">
                <ImageOff className="size-5" />
                No creative uploaded
              </div>
            )}

            <Field
              label="Upload image"
              htmlFor="creative"
              error={errors.creative}
              hint="PNG, JPG, GIF, WEBP or SVG up to 5MB."
            >
              <Input
                id="creative"
                name="creative"
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                onChange={handleFileChange}
                className="cursor-pointer py-1.5"
              />
            </Field>

            {creativeUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => {
                  setCreativeUrl('')
                  setPreview(null)
                }}
              >
                <Trash2 />
                Remove stored creative
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Runs in</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {(() => {
              const issue = issues.find((candidate) => candidate.id === issueId)
              return issue ? (
                <>
                  <p className="font-medium">{issue.title}</p>
                  <p className="tabular text-muted-foreground">
                    {formatDate(issue.publishDate)}
                  </p>
                  <Button asChild variant="link" className="mt-1 h-auto px-0">
                    <Link href={`/issues/${issue.id}`}>View issue inventory</Link>
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground">Pick an issue.</p>
              )
            })()}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={pending}>
            <Upload />
            {pending ? 'Saving…' : editing ? 'Save changes' : 'Create booking'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={editing && booking?.id ? `/bookings/${booking.id}` : '/bookings'}>
              Cancel
            </Link>
          </Button>
        </div>
      </div>
    </form>
  )
}
