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
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Field } from '@/components/ui/field'
import {
  DIRECTORY_TOWNS,
  JOB_CATEGORIES,
  JOB_STATUSES,
  JOB_TIERS,
  JOB_TYPES,
  PAID_STATUSES,
  label,
} from '@/lib/enums'
import { wordCountState } from '@/lib/classifieds'
import {
  JOB_WORD_MAX,
  countWords,
  defaultClosesAt,
  displayTown,
  priceForTier,
  requiresWordCount,
  wordCountMessage,
} from '@/lib/jobs'
import { cn, formatMoney, toDateInput } from '@/lib/utils'
import { saveJob } from './actions'

export type JobFormValues = {
  id: string
  title: string
  employer: string
  body: string
  category: string
  jobType: string
  town: string
  pay: string
  applyUrl: string
  status: string
  tier: string
  paid: string
  logoUrl: string
  closesAt: string
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

export function JobForm({
  job,
  issues,
  trigger,
}: {
  job?: JobFormValues
  issues: IssueOption[]
  trigger?: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [body, setBody] = React.useState(job?.body ?? '')
  const [status, setStatus] = React.useState(job?.status ?? 'DRAFT')
  const [tier, setTier] = React.useState(job?.tier ?? 'STANDARD')

  const editing = Boolean(job?.id)
  const words = countWords(body)
  const state = wordCountState(words)
  // Drafts only get a nudge; approving or publishing is what the server blocks.
  const blocking = requiresWordCount(status) && state !== 'ok'
  const defaultCloses = React.useMemo(() => toDateInput(defaultClosesAt()), [])

  function resetFields() {
    setErrors({})
    setBody(job?.body ?? '')
    setStatus(job?.status ?? 'DRAFT')
    setTier(job?.tier ?? 'STANDARD')
  }

  function close() {
    setOpen(false)
    resetFields()
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await saveJob(form)
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
          <DialogTitle>{editing ? 'Edit job listing' : 'New job listing'}</DialogTitle>
          <DialogDescription>
            The role, who&rsquo;s hiring, up to {JOB_WORD_MAX} words, and a way for
            applicants to reply.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {job?.id ? <input type="hidden" name="id" value={job.id} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role title" htmlFor="title" required error={errors.title}>
              <Input
                id="title"
                name="title"
                defaultValue={job?.title ?? ''}
                placeholder="Weekend barista"
                maxLength={120}
                aria-invalid={Boolean(errors.title)}
                required
              />
            </Field>

            <Field label="Employer" htmlFor="employer" required error={errors.employer}>
              <Input
                id="employer"
                name="employer"
                defaultValue={job?.employer ?? ''}
                placeholder="Coastline Coffee"
                maxLength={120}
                aria-invalid={Boolean(errors.employer)}
                required
              />
            </Field>
          </div>

          <Field
            label="Listing copy"
            htmlFor="body"
            required
            error={errors.body}
            hint={`Up to ${JOB_WORD_MAX} words. Drafts can run long; approving or publishing can't.`}
          >
            <Textarea
              id="body"
              name="body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={7}
              placeholder="The hours, what the work involves, who it would suit, and anything an applicant needs to know before they get in touch."
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
                defaultValue={job?.category ?? 'HOSPITALITY'}
              >
                {JOB_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {label(value)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Job type" htmlFor="jobType" required error={errors.jobType}>
              <Select id="jobType" name="jobType" defaultValue={job?.jobType ?? 'CASUAL'}>
                {JOB_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {label(value)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Town" htmlFor="town" required error={errors.town}>
              <Select id="town" name="town" defaultValue={job?.town ?? 'Orewa'}>
                {DIRECTORY_TOWNS.map((value) => (
                  <option key={value} value={value}>
                    {displayTown(value)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Pay"
              htmlFor="pay"
              error={errors.pay}
              hint="Optional — free text, e.g. $24–$27/hr."
            >
              <Input
                id="pay"
                name="pay"
                defaultValue={job?.pay ?? ''}
                placeholder="$24–$27/hr"
                maxLength={60}
                aria-invalid={Boolean(errors.pay)}
              />
            </Field>
          </div>

          <Field
            label="Apply online"
            htmlFor="applyUrl"
            error={errors.applyUrl}
            hint="Optional — a full URL starting http:// or https://"
          >
            <Input
              id="applyUrl"
              name="applyUrl"
              defaultValue={job?.applyUrl ?? ''}
              placeholder="https://example.co.nz/careers"
              aria-invalid={Boolean(errors.applyUrl)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Tier" htmlFor="tier" required error={errors.tier}>
              <Select
                id="tier"
                name="tier"
                value={tier}
                onChange={(event) => setTier(event.target.value)}
              >
                {JOB_TIERS.map((value) => (
                  <option key={value} value={value}>
                    {label(value)} — {formatMoney(priceForTier(value), true)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Closes"
              htmlFor="closesAt"
              required
              error={errors.closesAt}
              hint="Defaults to a 90-day run."
            >
              <Input
                id="closesAt"
                name="closesAt"
                type="date"
                defaultValue={job?.closesAt || defaultCloses}
                aria-invalid={Boolean(errors.closesAt)}
                required
              />
            </Field>

            <Field
              label="Fee paid"
              htmlFor="paid"
              error={errors.paid}
              hint="Set off the Stripe dashboard."
            >
              <Select id="paid" name="paid" defaultValue={job?.paid || 'UNPAID'}>
                {PAID_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {label(value)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {tier === 'FEATURED' ? (
            <Field
              label="Employer logo URL"
              htmlFor="logoUrl"
              error={errors.logoUrl}
              hint="Featured only. A hosted image URL — added when moderating, before the listing goes live."
            >
              <Input
                id="logoUrl"
                name="logoUrl"
                defaultValue={job?.logoUrl ?? ''}
                placeholder="https://cdn.example.co.nz/logo.png"
                aria-invalid={Boolean(errors.logoUrl)}
              />
            </Field>
          ) : (
            <input type="hidden" name="logoUrl" value={job?.logoUrl ?? ''} />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status" htmlFor="status" required error={errors.status}>
              <Select
                id="status"
                name="status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {JOB_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {label(value)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Issue"
              htmlFor="issueId"
              error={errors.issueId}
              hint="Leave unassigned to keep it in the queue."
            >
              <Select id="issueId" name="issueId" defaultValue={job?.issueId ?? ''}>
                <option value="">Unassigned</option>
                {issues.map((issue) => (
                  <option key={issue.id} value={issue.id}>
                    {issue.title}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Contact name" htmlFor="contactName" error={errors.contactName}>
            <Input
              id="contactName"
              name="contactName"
              defaultValue={job?.contactName ?? ''}
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
                defaultValue={job?.contactEmail ?? ''}
                placeholder="jobs@example.co.nz"
                aria-invalid={Boolean(errors.contactEmail)}
              />
            </Field>

            <Field label="Phone" htmlFor="contactPhone" error={errors.contactPhone}>
              <Input
                id="contactPhone"
                name="contactPhone"
                defaultValue={job?.contactPhone ?? ''}
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
            <Textarea id="notes" name="notes" defaultValue={job?.notes ?? ''} rows={2} />
          </Field>

          {tier === 'FEATURED' ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Star className="size-3.5 text-steel" />
              Featured listings lead the Jobs block and carry the employer logo.
            </p>
          ) : null}

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
