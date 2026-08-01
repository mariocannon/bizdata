import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Numbers are the hero: large, tabular, with a quiet label and one sublabel. */
export function KpiCard({
  label,
  value,
  sublabel,
  href,
  tone = 'default',
}: {
  label: string
  value: string
  sublabel?: string
  href?: string
  tone?: 'default' | 'positive' | 'warning'
}) {
  const body = (
    <>
      <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
        {href ? (
          <ArrowUpRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
        ) : null}
      </p>
      <p
        className={cn(
          'tabular mt-1.5 text-3xl font-semibold leading-none',
          tone === 'positive' && 'text-emerald-700',
          tone === 'warning' && 'text-amber-700'
        )}
      >
        {value}
      </p>
      {sublabel ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{sublabel}</p>
      ) : null}
    </>
  )

  const className = cn(
    'group rounded-lg border border-border bg-card p-4 shadow-sm transition-colors',
    href && 'hover:border-primary/40 hover:bg-accent/40'
  )

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}
