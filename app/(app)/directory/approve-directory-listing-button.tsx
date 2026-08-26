'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { approveDirectoryListing } from './actions'

/**
 * One click, no confirmation dialog — unlike delete, approving is never
 * destructive: the row already exists and the only thing this changes is
 * whether it is shown on the public site.
 */
export function ApproveDirectoryListingButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  function handleApprove() {
    startTransition(async () => {
      const result = await approveDirectoryListing(id)
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
      aria-label={`Approve ${name}`}
      className={cn(
        'rounded px-1.5 py-0.5 text-xs font-medium text-success',
        'hover:bg-success-soft disabled:pointer-events-none disabled:opacity-50'
      )}
    >
      {pending ? 'Approving…' : 'Approve'}
    </button>
  )
}
