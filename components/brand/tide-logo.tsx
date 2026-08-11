import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * The Tide logo — the Sea Glass sunrise roundel over the wordmark.
 *
 * Rules from docs/BRANDING.md §4: never recolour it, never redraw it, never
 * stretch it, and only ever place it on a light ground (Foam, Sand or Paper).
 * It is Sea Glass on transparent, so it disappears on the navy sidebar — use
 * `<TideMark>` there instead.
 */
export function TideLogo({
  className,
  priority = false,
}: {
  className?: string
  priority?: boolean
}) {
  return (
    <Image
      src="/brand/tide-logo.webp"
      alt="The Tide"
      width={782}
      height={978}
      priority={priority}
      // Clear space: keep at least half the logo's width free on every side.
      className={cn('h-auto w-full max-w-[9rem]', className)}
    />
  )
}
