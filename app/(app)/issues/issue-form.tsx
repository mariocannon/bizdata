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
import { Field } from '@/components/ui/field'
import { ISSUE_STATUSES, label } from '@/lib/enums'
import { saveIssue } from './actions'

export type IssueFormValues = {
  id: string
  title: string
  publishDate: string
  status: string
  theme: string
}

/** Suggests "The Tide — 14 Aug 2025" from whatever date is picked. */
function suggestTitle(date: string): string {
  if (!date) return ''
  const [y, m, d] = date.split('-').map(Number)
  const parsed = new Date(y, (m ?? 1) - 1, d ?? 1)
  if (Number.isNaN(parsed.getTime())) return ''
  const formatted = new Intl.DateTimeFormat('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
  return `The Tide — ${formatted}`
}

export function IssueForm({
  issue,
  trigger,
}: {
  issue?: IssueFormValues
  trigger?: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [title, setTitle] = React.useState(issue?.title ?? '')
  const [titleTouched, setTitleTouched] = React.useState(Boolean(issue?.title))

  const editing = Boolean(issue?.id)

  // The title is the one field held in state — the rest are uncontrolled and
  // rebuilt from `issue` when the dialog remounts. It has to be put back
  // deliberately, on the way *in* as well as out: the trigger shares one
  // component instance with the dialog, so a title left behind by a cancelled
  // edit or a saved "New issue" would otherwise still be there the next time
  // the dialog is opened.
  function resetFields() {
    setErrors({})
    setTitle(issue?.title ?? '')
    setTitleTouched(Boolean(issue?.title))
  }

  // Closing from our own buttons never reaches onOpenChange, so it resets here.
  function close() {
    setOpen(false)
    resetFields()
  }

  function handleDateChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (!titleTouched) setTitle(suggestTitle(event.target.value))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await saveIssue(form)
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
            New issue
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit issue' : 'New issue'}</DialogTitle>
          <DialogDescription>
            Each issue carries its own set of ad slots.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {issue?.id ? <input type="hidden" name="id" value={issue.id} /> : null}

          <Field label="Publish date" htmlFor="publishDate" required error={errors.publishDate}>
            <Input
              id="publishDate"
              name="publishDate"
              type="date"
              defaultValue={issue?.publishDate ?? ''}
              onChange={handleDateChange}
              aria-invalid={Boolean(errors.publishDate)}
              required
            />
          </Field>

          <Field label="Title" htmlFor="title" required error={errors.title}>
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value)
                setTitleTouched(true)
              }}
              placeholder="The Tide — 14 Aug 2025"
              aria-invalid={Boolean(errors.title)}
              required
            />
          </Field>

          <Field label="Status" htmlFor="status" required error={errors.status}>
            <Select id="status" name="status" defaultValue={issue?.status ?? 'PLANNING'}>
              {ISSUE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {label(status)}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Theme"
            htmlFor="theme"
            error={errors.theme}
            hint="Optional — what this issue is leading with."
          >
            <Input
              id="theme"
              name="theme"
              defaultValue={issue?.theme ?? ''}
              placeholder="Delmore stage 2 consent + Ōrewa night market"
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
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Create issue'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
