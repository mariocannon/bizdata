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
import {
  CLASSIFIED_CATEGORIES,
  CLASSIFIED_STATUSES,
  PAID_STATUSES,
  label,
} from '@/lib/enums'
import {
  CLASSIFIED_WORD_MAX,
  countWords,
  requiresWordCount,
  wordCountMessage,
  wordCountState,
} from '@/lib/classifieds'
import { FEATURED_CLASSIFIED_FEE } from '@/lib/featured'
import { cn, formatMoney } from '@/lib/utils'
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
  const [featured, setFeatured] = React.useState(classified?.featured ?? false)
  const [preview, setPreview] = React.useState<string | null>(classified?.imageUrl || null)

  const editing = Boolean(classified?.id)
  const words = countWords(body)
  const state = wordCountState(words)
  // Drafts only get a nudge; approving or publishing is what the server blocks.
  const blocking = requiresWordCount(status) && state !== 'ok'

  // Copy, status and the featured upgrade are the only fields held in state —
  // every other one is uncontrolled and gets rebuilt from `classified` when the
  // dialog remounts. These have to be put back deliberately, and on the way
  // *in* as well as out: the trigger shares one component instance with the
  // dialog, so copy left behind by a cancelled edit or a saved "New classified"
  // would otherwise still be sitting there the next time the dialog is opened —
  // against a different listing, or against a listing that no longer exists.
  function resetFields() {
    setErrors({})
    setBody(classified?.body ?? '')
    setStatus(classified?.status ?? 'DRAFT')
    setFeatured(classified?.featured ?? false)
    setPreview(classified?.imageUrl || null)
  }

  // Object URLs are only valid until revoked; drop the last one whenever the
  // preview moves on so repeated picks don't leak.
  React.useEffect(() => {
    if (!preview?.startsWith('blob:')) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  function handleImageChange(changed: React.ChangeEvent<HTMLInputElement>) {
    const selected = changed.target.files?.[0]
    setPreview(selected ? URL.createObjectURL(selected) : classified?.imageUrl || null)
  }

  // Closing from our own buttons never reaches onOpenChange, so it resets here.
  function close() {
    setOpen(false)
    resetFields()
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await saveClassified(form)
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
          {/* The image already stored, so saving without picking a new one
              keeps it rather than reading as "featured with no image". */}
          <input type="hidden" name="imageUrl" value={classified?.imageUrl ?? ''} />

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

          {/* The one paid upgrade a listing can carry — the same one an event
              carries. Ticking it opens the image picker; the fee is fixed and
              the payment state is chased from the list. */}
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
                  Featured listing — {formatMoney(FEATURED_CLASSIFIED_FEE, true)}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  The listing runs with an image above its copy and leads the
                  classifieds block in the beehiiv export.
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
                  label={`Fee (${formatMoney(FEATURED_CLASSIFIED_FEE, true)})`}
                  htmlFor="featuredPaid"
                  error={errors.featuredPaid}
                  hint="What's owed on the upgrade — chase it from the list."
                >
                  <Select
                    id="featuredPaid"
                    name="featuredPaid"
                    defaultValue={classified?.featuredPaid || 'UNPAID'}
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
              onClick={close}
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
