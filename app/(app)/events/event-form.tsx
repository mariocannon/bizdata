'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ImageOff, Plus, Star } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Field } from '@/components/ui/field'
import { EVENT_CATEGORIES, EVENT_STATUSES, PAID_STATUSES, label } from '@/lib/enums'
import { countWords, wordCountMessage, wordCountState } from '@/lib/classifieds'
import { EVENT_WORD_MAX, FEATURED_EVENT_FEE, requiresWordCount } from '@/lib/events'
import { cn, formatMoney } from '@/lib/utils'
import { saveEvent } from './actions'

export type EventFormValues = {
  id: string
  title: string
  body: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  location: string
  category: string
  status: string
  contactName: string
  contactEmail: string
  contactPhone: string
  ticketUrl: string
  issueId: string
  notes: string
  featured: boolean
  imageUrl: string
  featuredPaid: string
}

export type IssueOption = { id: string; title: string }

const COUNTER_STYLES: Record<string, string> = {
  empty: 'text-muted-foreground',
  ok: 'text-success',
  long: 'text-attention',
}

export function EventForm({
  event,
  issues,
  trigger,
}: {
  event?: EventFormValues
  issues: IssueOption[]
  trigger?: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [body, setBody] = React.useState(event?.body ?? '')
  const [status, setStatus] = React.useState(event?.status ?? 'DRAFT')
  const [featured, setFeatured] = React.useState(event?.featured ?? false)
  const [preview, setPreview] = React.useState<string | null>(event?.imageUrl || null)

  const editing = Boolean(event?.id)
  const words = countWords(body)
  const state = wordCountState(words)
  const blocking = requiresWordCount(status) && state !== 'ok'

  // Copy, status and the featured upgrade are the only fields held in state —
  // every other one is uncontrolled and gets rebuilt from `event` when the
  // dialog remounts. These have to be put back deliberately, and on the way
  // *in* as well as out: the trigger on each row shares one component instance
  // with the dialog, so copy left behind by a cancelled edit or a saved "New
  // event" would otherwise still be sitting there the next time the dialog is
  // opened — against a different event.
  function resetFields() {
    setErrors({})
    setBody(event?.body ?? '')
    setStatus(event?.status ?? 'DRAFT')
    setFeatured(event?.featured ?? false)
    setPreview(event?.imageUrl || null)
  }

  // Object URLs are only valid until revoked; drop the last one whenever the
  // preview moves on so repeated picks don't leak.
  React.useEffect(() => {
    if (!preview?.startsWith('blob:')) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  function handleImageChange(changed: React.ChangeEvent<HTMLInputElement>) {
    const selected = changed.target.files?.[0]
    setPreview(selected ? URL.createObjectURL(selected) : event?.imageUrl || null)
  }

  // Closing from our own buttons never reaches onOpenChange, so it resets here.
  function close() {
    setOpen(false)
    resetFields()
  }

  function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    const form = new FormData(formEvent.currentTarget)

    startTransition(async () => {
      const result = await saveEvent(form)
      if (result.ok) {
        close()
        toast.success(result.message ?? 'Saved.')
        router.refresh()
      } else {
        setErrors(result.errors ?? {})
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        resetFields()
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus />
            New event
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit event' : 'New event'}</DialogTitle>
          <DialogDescription>
            When and where it is, up to {EVENT_WORD_MAX} words, and a contact.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {event?.id ? <input type="hidden" name="id" value={event.id} /> : null}
          {/* The image already stored, so saving without picking a new one
              keeps it rather than reading as "featured with no image". */}
          <input type="hidden" name="imageUrl" value={event?.imageUrl ?? ''} />

          <Field label="Event" htmlFor="title" required error={errors.title}>
            <Input
              id="title"
              name="title"
              defaultValue={event?.title ?? ''}
              placeholder="Ōrewa Night Market"
              maxLength={120}
              aria-invalid={Boolean(errors.title)}
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts" htmlFor="startDate" required error={errors.startDate}>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={event?.startDate ?? ''}
                aria-invalid={Boolean(errors.startDate)}
                required
              />
            </Field>

            <Field
              label="Start time"
              htmlFor="startTime"
              error={errors.startTime}
              hint="Leave blank for an all-day listing."
            >
              <Input
                id="startTime"
                name="startTime"
                type="time"
                defaultValue={event?.startTime ?? ''}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Ends"
              htmlFor="endDate"
              error={errors.endDate}
              hint="Only for events that run past one day."
            >
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={event?.endDate ?? ''}
                aria-invalid={Boolean(errors.endDate)}
              />
            </Field>

            <Field label="End time" htmlFor="endTime" error={errors.endTime}>
              <Input
                id="endTime"
                name="endTime"
                type="time"
                defaultValue={event?.endTime ?? ''}
              />
            </Field>
          </div>

          <Field
            label="Where"
            htmlFor="location"
            error={errors.location}
            hint="Venue and suburb — what a reader needs to find it."
          >
            <Input
              id="location"
              name="location"
              defaultValue={event?.location ?? ''}
              placeholder="Ōrewa Community Centre, Ōrewa"
            />
          </Field>

          <Field
            label="Listing copy"
            htmlFor="body"
            required
            error={errors.body}
            hint={`Up to ${EVENT_WORD_MAX} words. Drafts can run long; approving or publishing can't.`}
          >
            <Textarea
              id="body"
              name="body"
              value={body}
              onChange={(changed) => setBody(changed.target.value)}
              rows={6}
              placeholder="What's on, who it's for, and anything a reader needs to know before they turn up."
              aria-invalid={Boolean(errors.body) || blocking}
              aria-describedby="body-count"
              required
            />
            <p
              id="body-count"
              aria-live="polite"
              className={cn('tabular text-xs font-medium', COUNTER_STYLES[state])}
            >
              {wordCountMessage(words)}
            </p>
          </Field>

          {/* The one paid upgrade a listing can carry. Ticking it opens the
              image picker; the fee is fixed and the payment state is chased
              from the list. */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-3">
            <label htmlFor="featured" className="flex cursor-pointer items-start gap-2.5">
              <Checkbox
                id="featured"
                name="featured"
                checked={featured}
                onChange={(changed) => setFeatured(changed.target.checked)}
                className="mt-0.5"
              />
              <span className="text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <Star className="size-3.5 text-steel" />
                  Featured event — {formatMoney(FEATURED_EVENT_FEE, true)}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  The listing runs with an image above its copy, and the image
                  travels with the beehiiv export.
                </span>
              </span>
            </label>

            {featured ? (
              <div className="flex flex-col gap-3 border-t border-border pt-3">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt="Featured image preview"
                    className="max-h-48 w-full rounded border border-border bg-muted object-contain"
                  />
                ) : (
                  <div className="flex h-24 flex-col items-center justify-center gap-1.5 rounded border border-dashed border-border text-xs text-muted-foreground">
                    <ImageOff className="size-5" />
                    No image yet
                  </div>
                )}

                <Field
                  label="Image"
                  htmlFor="image"
                  required
                  error={errors.image}
                  hint="PNG, JPG, GIF, WEBP or SVG, up to 5MB. Landscape reads best."
                >
                  <Input
                    id="image"
                    name="image"
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                    onChange={handleImageChange}
                    aria-invalid={Boolean(errors.image)}
                  />
                </Field>

                <Field
                  label={`Fee (${formatMoney(FEATURED_EVENT_FEE, true)})`}
                  htmlFor="featuredPaid"
                  error={errors.featuredPaid}
                  hint="What's owed on the upgrade — chase it from the list."
                >
                  <Select
                    id="featuredPaid"
                    name="featuredPaid"
                    defaultValue={event?.featuredPaid || 'UNPAID'}
                  >
                    {PAID_STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {label(value)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="category" required error={errors.category}>
              <Select
                id="category"
                name="category"
                defaultValue={event?.category ?? 'COMMUNITY'}
              >
                {EVENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {label(category)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Status" htmlFor="status" required error={errors.status}>
              <Select
                id="status"
                name="status"
                value={status}
                onChange={(changed) => setStatus(changed.target.value)}
              >
                {EVENT_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {label(value)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label="Issue"
            htmlFor="issueId"
            error={errors.issueId}
            hint="Leave unassigned to keep it in the queue until an issue is picked."
          >
            <Select id="issueId" name="issueId" defaultValue={event?.issueId ?? ''}>
              <option value="">Unassigned</option>
              {issues.map((issue) => (
                <option key={issue.id} value={issue.id}>
                  {issue.title}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Tickets / more info"
            htmlFor="ticketUrl"
            error={errors.ticketUrl}
            hint="Optional — a full URL starting http:// or https://"
          >
            <Input
              id="ticketUrl"
              name="ticketUrl"
              defaultValue={event?.ticketUrl ?? ''}
              placeholder="https://example.co.nz/tickets"
              aria-invalid={Boolean(errors.ticketUrl)}
            />
          </Field>

          <Field label="Contact name" htmlFor="contactName" error={errors.contactName}>
            <Input
              id="contactName"
              name="contactName"
              defaultValue={event?.contactName ?? ''}
              placeholder="Jo Ngata"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="contactEmail" error={errors.contactEmail}>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                defaultValue={event?.contactEmail ?? ''}
                placeholder="jo@example.co.nz"
                aria-invalid={Boolean(errors.contactEmail)}
              />
            </Field>

            <Field label="Phone" htmlFor="contactPhone" error={errors.contactPhone}>
              <Input
                id="contactPhone"
                name="contactPhone"
                defaultValue={event?.contactPhone ?? ''}
                placeholder="021 555 0142"
              />
            </Field>
          </div>

          <Field
            label="Notes"
            htmlFor="notes"
            error={errors.notes}
            hint="Optional — internal only, never printed."
          >
            <Textarea id="notes" name="notes" defaultValue={event?.notes ?? ''} rows={2} />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Add event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
