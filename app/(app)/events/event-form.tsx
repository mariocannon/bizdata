'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Field } from '@/components/ui/field'
import { EVENT_CATEGORIES, EVENT_STATUSES, label } from '@/lib/enums'
import { countWords, wordCountMessage, wordCountState } from '@/lib/classifieds'
import { EVENT_WORD_MAX, requiresWordCount } from '@/lib/events'
import { cn } from '@/lib/utils'
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
}

export type IssueOption = { id: string; title: string }

const COUNTER_STYLES: Record<string, string> = {
  empty: 'text-muted-foreground',
  ok: 'text-emerald-700',
  long: 'text-amber-700',
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

  const editing = Boolean(event?.id)
  const words = countWords(body)
  const state = wordCountState(words)
  const blocking = requiresWordCount(status) && state !== 'ok'

  function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    const form = new FormData(formEvent.currentTarget)

    startTransition(async () => {
      const result = await saveEvent(form)
      if (result.ok) {
        setErrors({})
        setOpen(false)
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
        if (!next) {
          setErrors({})
          setBody(event?.body ?? '')
          setStatus(event?.status ?? 'DRAFT')
        }
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
              onClick={() => setOpen(false)}
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
