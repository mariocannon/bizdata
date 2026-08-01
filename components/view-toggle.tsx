'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

export type ViewOption = { value: string; label: string }

/**
 * View switching lives in the URL (`?view=calendar`) so any view — including a
 * filtered one — can be linked to or bookmarked.
 */
export function ViewToggle({
  options,
  param = 'view',
  current,
}: {
  options: ViewOption[]
  param?: string
  current: string
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function hrefFor(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === options[0]?.value) params.delete(param)
    else params.set(param, value)
    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  return (
    <div
      className="inline-flex items-center rounded-md border border-border bg-muted/60 p-0.5"
      role="tablist"
    >
      {options.map((option) => {
        const active = option.value === current
        return (
          <Link
            key={option.value}
            href={hrefFor(option.value)}
            role="tab"
            aria-selected={active}
            scroll={false}
            className={cn(
              'rounded px-3 py-1 text-sm font-medium transition-colors',
              active
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {option.label}
          </Link>
        )
      })}
    </div>
  )
}
