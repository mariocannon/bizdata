'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Select } from '@/components/ui/select'
import { assignJobToIssue } from './actions'
import type { IssueOption } from './job-form'

/**
 * Slot a listing into an issue straight from the list, without opening the
 * edit form — the queue workflow is "approve, then place in the next issue",
 * and this is the second half of it.
 */
export function AssignIssueSelect({
  id,
  issueId,
  issues,
}: {
  id: string
  issueId: string
  issues: IssueOption[]
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value
    startTransition(async () => {
      const result = await assignJobToIssue(id, next)
      if (result.ok) {
        toast.success(result.message ?? 'Saved.')
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Select
      aria-label="Issue"
      value={issueId}
      onChange={handleChange}
      disabled={pending}
      className="h-8 min-w-[8rem] text-xs"
    >
      <option value="">Unassigned</option>
      {issues.map((issue) => (
        <option key={issue.id} value={issue.id}>
          {issue.title}
        </option>
      ))}
    </Select>
  )
}
