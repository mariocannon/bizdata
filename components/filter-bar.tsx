'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type SelectFilter = {
  param: string
  label: string
  allLabel?: string
  options: { value: string; label: string }[]
  className?: string
}

/**
 * Every list page filters through the URL, so a filtered view is always a
 * shareable link and the dashboard can deep-link straight into one.
 */
export function FilterBar({
  search,
  filters = [],
  children,
  className,
}: {
  search?: { param: string; placeholder: string }
  filters?: SelectFilter[]
  children?: React.ReactNode
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const searchParam = search?.param ?? 'q'
  const [term, setTerm] = React.useState(searchParams.get(searchParam) ?? '')

  // Keep the box in sync when navigation changes the URL underneath it.
  React.useEffect(() => {
    setTerm(searchParams.get(searchParam) ?? '')
  }, [searchParams, searchParam])

  const buildHref = React.useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      const query = params.toString()
      return query ? `${pathname}?${query}` : pathname
    },
    [pathname, searchParams]
  )

  // Debounce so typing doesn't fire a navigation per keystroke.
  React.useEffect(() => {
    if (!search) return
    const current = searchParams.get(searchParam) ?? ''
    if (term === current) return

    const timer = setTimeout(() => {
      router.replace(buildHref({ [searchParam]: term }), { scroll: false })
    }, 250)

    return () => clearTimeout(timer)
  }, [term, search, searchParam, searchParams, router, buildHref])

  const activeCount = filters.filter((f) => searchParams.get(f.param)).length
  const hasSearch = Boolean(searchParams.get(searchParam))

  return (
    <div className={cn('flex flex-wrap items-end gap-3', className)}>
      {search ? (
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={search.placeholder}
            aria-label={search.placeholder}
            className="pl-8"
          />
        </div>
      ) : null}

      {filters.map((filter) => (
        <div key={filter.param} className={cn('flex flex-col gap-1', filter.className)}>
          <label
            htmlFor={`filter-${filter.param}`}
            className="text-xs font-medium text-muted-foreground"
          >
            {filter.label}
          </label>
          <Select
            id={`filter-${filter.param}`}
            value={searchParams.get(filter.param) ?? ''}
            onChange={(event) =>
              router.replace(buildHref({ [filter.param]: event.target.value }), {
                scroll: false,
              })
            }
            className="min-w-[150px]"
          >
            <option value="">{filter.allLabel ?? `All ${filter.label.toLowerCase()}`}</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      ))}

      {children}

      {activeCount > 0 || hasSearch ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setTerm('')
            const params = new URLSearchParams(searchParams.toString())
            for (const filter of filters) params.delete(filter.param)
            params.delete(searchParam)
            const query = params.toString()
            router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
          }}
        >
          <X />
          Clear
        </Button>
      ) : null}
    </div>
  )
}
