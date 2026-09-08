'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { approveJob } from './actions'

/**
 * One click, no confirmation — approving is never destructive: it moves a
 * submitted listing out of the queue and snapshots its tier price. A featured
 * listing with no logo yet is bounced back with a message.
 */
export function ApproveJobButton({ id, title }: { id: string; title: string }) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  function handleApprove() {
    startTransition(async () => {
      const result = await approveJob(id)
      if (result.ok) {
        toast.success(result.message ?? 'Approved.')
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleApprove}
      disabled={pending}
      aria-label={`Approve ${title}`}
      className={cn(
        'rounded px-1.5 py-0.5 text-xs font-medium text-success',
        'hover:bg-success-soft disabled:pointer-events-none disabled:opacity-50'
      )}
    >
      {pending ? 'Approving…' : 'Approve'}
    </button>
  )
}
