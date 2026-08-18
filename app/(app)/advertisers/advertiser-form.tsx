'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { ADVERTISER_CATEGORIES, ADVERTISER_STATUSES, label } from '@/lib/enums'
import { saveAdvertiser } from './actions'

export type AdvertiserFormValues = {
  id: string
  name: string
  category: string
  status: string
  contactName: string
  email: string
  phone: string
  website: string
  reviewsChecked: boolean
  lastContacted: string
  notes: string
}

export function AdvertiserForm({
  advertiser,
  trigger,
}: {
  advertiser?: AdvertiserFormValues
  trigger?: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const editing = Boolean(advertiser?.id)

  // Every field here is uncontrolled and rebuilt from `advertiser` when the
  // dialog remounts; only the error list survives, so it is cleared on the way
  // *in* as well as out. Closing from our own buttons never reaches
  // onOpenChange, so those route through `close` too.
  function close() {
    setOpen(false)
    setErrors({})
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await saveAdvertiser(form)
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
        setErrors({})
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            {editing ? <Pencil /> : <Plus />}
            {editing ? 'Edit' : 'New advertiser'}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit advertiser' : 'New advertiser'}</DialogTitle>
          <DialogDescription>
            Track this business through the pipeline and see everything they book.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {advertiser?.id ? <input type="hidden" name="id" value={advertiser.id} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Business name"
              htmlFor="name"
              required
              error={errors.name}
              className="sm:col-span-2"
            >
              <Input
                id="name"
                name="name"
                defaultValue={advertiser?.name ?? ''}
                aria-invalid={Boolean(errors.name)}
                placeholder="Example Realty Ōrewa"
                autoFocus
                required
              />
            </Field>

            <Field label="Category" htmlFor="category" required error={errors.category}>
              <Select
                id="category"
                name="category"
                defaultValue={advertiser?.category ?? 'OTHER'}
              >
                {ADVERTISER_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {label(category)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Pipeline status" htmlFor="status" required error={errors.status}>
              <Select id="status" name="status" defaultValue={advertiser?.status ?? 'PROSPECT'}>
                {ADVERTISER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {label(status)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Contact name" htmlFor="contactName" error={errors.contactName}>
              <Input
                id="contactName"
                name="contactName"
                defaultValue={advertiser?.contactName ?? ''}
              />
            </Field>

            <Field label="Email" htmlFor="email" error={errors.email}>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={advertiser?.email ?? ''}
                aria-invalid={Boolean(errors.email)}
              />
            </Field>

            <Field label="Phone" htmlFor="phone" error={errors.phone}>
              <Input id="phone" name="phone" defaultValue={advertiser?.phone ?? ''} />
            </Field>

            <Field
              label="Website"
              htmlFor="website"
              error={errors.website}
              hint="Include https://"
            >
              <Input
                id="website"
                name="website"
                inputMode="url"
                placeholder="https://"
                defaultValue={advertiser?.website ?? ''}
                aria-invalid={Boolean(errors.website)}
              />
            </Field>

            <Field label="Last contacted" htmlFor="lastContacted" error={errors.lastContacted}>
              <Input
                id="lastContacted"
                name="lastContacted"
                type="date"
                defaultValue={advertiser?.lastContacted ?? ''}
              />
            </Field>

            <div className="flex items-center gap-2 sm:mt-6">
              <Checkbox
                id="reviewsChecked"
                name="reviewsChecked"
                defaultChecked={advertiser?.reviewsChecked ?? false}
              />
              <label htmlFor="reviewsChecked" className="text-sm font-medium">
                Reviews checked
              </label>
            </div>

            <Field
              label="Notes"
              htmlFor="notes"
              error={errors.notes}
              className="sm:col-span-2"
            >
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                defaultValue={advertiser?.notes ?? ''}
                placeholder="What they want, who to talk to, what they've said no to."
              />
            </Field>
          </div>

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
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Add advertiser'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
