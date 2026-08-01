'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PAID_STATUSES, label } from '@/lib/enums'
import { updateBookingPaid } from './actions'

/** Inline payment update so the chase list can be worked without leaving it. */
export function PaidStatusSelect({ id, paid }: { id: string; paid: string }) {
  const router = useRouter()
  const [value, setValue] = React.useState(paid)
  const [pending, startTransition] = React.useTransition()

  React.useEffect(() => setValue(paid), [paid])

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value
    const previous = value
    setValue(next)

    startTransition(async () => {
      const result = await updateBookingPaid(id, next)
      if (result.ok) {
        toast.success(result.message ?? 'Updated.')
        router.refresh()
      } else {
        setValue(previous)
        toast.error(result.message)
      }
    })
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={pending}
      aria-label="Payment status"
      className="rounded-md border border-input bg-card px-2 py-1 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
    >
      {PAID_STATUSES.map((option) => (
        <option key={option} value={option}>
          {label(option)}
        </option>
      ))}
    </select>
  )
}
