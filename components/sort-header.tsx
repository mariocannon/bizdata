'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Clickable column header that writes `?sort=` / `?dir=` into the URL. */
export function SortHeader({
  column,
  children,
  align = 'left',
}: {
  column: string
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeSort = searchParams.get('sort')
  const activeDir = searchParams.get('dir') === 'desc' ? 'desc' : 'asc'
  const isActive = activeSort === column

  const params = new URLSearchParams(searchParams.toString())
  params.set('sort', column)
  params.set('dir', isActive && activeDir === 'asc' ? 'desc' : 'asc')

  const Icon = !isActive ? ChevronsUpDown : activeDir === 'asc' ? ArrowUp : ArrowDown

  return (
    <Link
      href={`${pathname}?${params.toString()}`}
      scroll={false}
      className={cn(
        'inline-flex items-center gap-1 transition-colors hover:text-foreground',
        align === 'right' && 'flex-row-reverse',
        isActive && 'text-foreground'
      )}
    >
      {children}
      <Icon className={cn('size-3', !isActive && 'opacity-40')} />
    </Link>
  )
}
