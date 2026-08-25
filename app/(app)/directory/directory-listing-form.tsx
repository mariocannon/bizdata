'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Star } from 'lucide-react'
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
import { DIRECTORY_CATEGORIES, DIRECTORY_TOWNS, label } from '@/lib/enums'
import { DIRECTORY_LISTING_CAP } from '@/lib/directory'
import { cn } from '@/lib/utils'
import { saveDirectoryListing } from './actions'

export type DirectoryListingFormValues = {
  id: string
  name: string
  category: string
  town: string
  blurb: string
  phone: string
  url: string
  featured: boolean
}

const BLURB_MIN = 61

export function DirectoryListingForm({
  listing,
  categoryCounts,
  defaultCategory,
  trigger,
}: {
  listing?: DirectoryListingFormValues
  /** How many listings each category already holds, so the category picker
   * can show "n/10" and the operator isn't surprised by a rejected save. */
  categoryCounts: Record<string, number>
  /** Pre-selects a category — used by the "Add" button on a category's own
   * section, so adding into "Plumbers" doesn't start on the first category
   * in the list. */
  defaultCategory?: string
  trigger?: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [blurb, setBlurb] = React.useState(listing?.blurb ?? '')
  const [featured, setFeatured] = React.useState(listing?.featured ?? false)

  const editing = Boolean(listing?.id)
  const blurbOk = blurb.trim().length >= BLURB_MIN

  function resetFields() {
    setErrors({})
    setBlurb(listing?.blurb ?? '')
    setFeatured(listing?.featured ?? false)
  }

  function close() {
    setOpen(false)
    resetFields()
  }

  function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    const form = new FormData(formEvent.currentTarget)

    startTransition(async () => {
      const result = await saveDirectoryListing(form)
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
            New listing
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit listing' : 'New listing'}</DialogTitle>
          <DialogDescription>
            A business for the directory — name, category, town and a short
            recommendation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {listing?.id ? <input type="hidden" name="id" value={listing.id} /> : null}

          <Field label="Name" htmlFor="name" required error={errors.name}>
            <Input
              id="name"
              name="name"
              defaultValue={listing?.name ?? ''}
              placeholder="Cafe Hibiscus"
              maxLength={160}
              aria-invalid={Boolean(errors.name)}
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Category"
              htmlFor="category"
              required
              error={errors.category}
              hint="Full categories are shown but still selectable — saving will be rejected."
            >
              <Select
                id="category"
                name="category"
                defaultValue={listing?.category ?? defaultCategory ?? DIRECTORY_CATEGORIES[0]}
              >
                {DIRECTORY_CATEGORIES.map((category) => {
                  const count = categoryCounts[category] ?? 0
                  const full = count >= DIRECTORY_LISTING_CAP && category !== listing?.category
                  return (
                    <option key={category} value={category}>
                      {label(category)} ({count}/{DIRECTORY_LISTING_CAP}
                      {full ? ' — full' : ''})
                    </option>
                  )
                })}
              </Select>
            </Field>

            <Field label="Town" htmlFor="town" required error={errors.town}>
              <Select id="town" name="town" defaultValue={listing?.town ?? DIRECTORY_TOWNS[0]}>
                {DIRECTORY_TOWNS.map((town) => (
                  <option key={town} value={town}>
                    {town}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label="Blurb"
            htmlFor="blurb"
            required
            error={errors.blurb}
            hint={`At least ${BLURB_MIN} characters — the public site treats anything shorter as too thin to be a recommendation.`}
          >
            <Textarea
              id="blurb"
              name="blurb"
              value={blurb}
              onChange={(changed) => setBlurb(changed.target.value)}
              rows={5}
              maxLength={600}
              placeholder="What makes this business worth the trip — specifics beat adjectives."
              aria-invalid={Boolean(errors.blurb) || !blurbOk}
              aria-describedby="blurb-count"
              required
            />
            <p
              id="blurb-count"
              aria-live="polite"
              className={cn(
                'tabular text-xs font-medium',
                blurbOk ? 'text-muted-foreground' : 'text-attention'
              )}
            >
              {blurb.trim().length} characters
              {!blurbOk ? ` — ${BLURB_MIN - blurb.trim().length} more needed` : ''}
            </p>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" htmlFor="phone" error={errors.phone}>
              <Input
                id="phone"
                name="phone"
                defaultValue={listing?.phone ?? ''}
                placeholder="021 555 0142"
              />
            </Field>

            <Field
              label="Website"
              htmlFor="url"
              error={errors.url}
              hint="Optional — a full URL starting http:// or https://"
            >
              <Input
                id="url"
                name="url"
                defaultValue={listing?.url ?? ''}
                placeholder="https://example.co.nz"
                aria-invalid={Boolean(errors.url)}
              />
            </Field>
          </div>

          <label
            htmlFor="featured"
            className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-muted/40 p-3"
          >
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
                Featured in this category
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Only one listing per category can be featured — it leads the
                category on the public page. Checking this removes the badge
                from whichever listing currently has it.
              </span>
            </span>
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Add listing'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
