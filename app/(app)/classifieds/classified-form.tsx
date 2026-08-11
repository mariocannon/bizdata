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
import { CLASSIFIED_CATEGORIES, CLASSIFIED_STATUSES, label } from '@/lib/enums'
import {
  CLASSIFIED_WORD_MAX,
  countWords,
  requiresWordCount,
  wordCountMessage,
  wordCountState,
} from '@/lib/classifieds'
import { cn } from '@/lib/utils'
import { saveClassified } from './actions'

export type ClassifiedFormValues = {
  id: string
  headline: string
  body: string
  category: string
  status: string
  contactName: string
  contactEmail: string
  contactPhone: string
  issueId: string
  notes: string
}

export type IssueOption = { id: string; title: string }

const COUNTER_STYLES: Record<string, string> = {
  empty: 'text-muted-foreground',
  ok: 'text-success',
  long: 'text-attention',
}

export function ClassifiedForm({
  classified,
  issues,
  trigger,
}: {
  classified?: ClassifiedFormValues
  issues: IssueOption[]
  trigger?: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [body, setBody] = React.useState(classified?.body ?? '')
  const [status, setStatus] = React.useState(classified?.status ?? 'DRAFT')

  const editing = Boolean(classified?.id)
  const words = countWords(body)
  const state = wordCountState(words)
  // Drafts only get a nudge; approving or publishing is what the server blocks.
  const blocking = requiresWordCount(status) && state !== 'ok'

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await saveClassified(form)
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
          setBody(classified?.body ?? '')
          setStatus(classified?.status ?? 'DRAFT')
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus />
            New classified
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit classified' : 'New classified'}</DialogTitle>
          <DialogDescription>
            A headline, up to {CLASSIFIED_WORD_MAX} words, and a contact number or
            email.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {classified?.id ? (
            <input type="hidden" name="id" value={classified.id} />
          ) : null}

          <Field label="Headline" htmlFor="headline" required error={errors.headline}>
            <Input
              id="headline"
              name="headline"
              defaultValue={classified?.headline ?? ''}
              placeholder="Tidy 4.2m alloy runabout, Ōrewa"
              maxLength={80}
              aria-invalid={Boolean(errors.headline)}
              required
            />
          </Field>

          <Field
            label="Listing copy"
            htmlFor="body"
            required
            error={errors.body}
            hint={`Up to ${CLASSIFIED_WORD_MAX} words. Drafts can run long; approving or publishing can't.`}
          >
            <Textarea
              id="body"
              name="body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={7}
              placeholder="What's on offer, why it's worth a look, and anything a reader needs to know before they get in touch."
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
                defaultValue={classified?.category ?? 'FOR_SALE'}
              >
                {CLASSIFIED_CATEGORIES.map((category) => (
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
                onChange={(event) => setStatus(event.target.value)}
              >
                {CLASSIFIED_STATUSES.map((value) => (
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
            <Select id="issueId" name="issueId" defaultValue={classified?.issueId ?? ''}>
              <option value="">Unassigned</option>
              {issues.map((issue) => (
                <option key={issue.id} value={issue.id}>
                  {issue.title}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Contact name" htmlFor="contactName" error={errors.contactName}>
            <Input
              id="contactName"
              name="contactName"
              defaultValue={classified?.contactName ?? ''}
              placeholder="Jo Ngata"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Email"
              htmlFor="contactEmail"
              error={errors.contactEmail}
              hint="Email or phone — at least one."
            >
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                defaultValue={classified?.contactEmail ?? ''}
                placeholder="jo@example.co.nz"
                aria-invalid={Boolean(errors.contactEmail)}
              />
            </Field>

            <Field label="Phone" htmlFor="contactPhone" error={errors.contactPhone}>
              <Input
                id="contactPhone"
                name="contactPhone"
                defaultValue={classified?.contactPhone ?? ''}
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
            <Textarea
              id="notes"
              name="notes"
              defaultValue={classified?.notes ?? ''}
              rows={2}
            />
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
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Add classified'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
