import { label, type AdType } from '@/lib/enums'
import { cn } from '@/lib/utils'

/**
 * One colour per ad type, shared by the bookings calendar and issue views.
 *
 * All seven come off the coastal ramp plus two brand states, so the chips read
 * as one family rather than seven competing hues (docs/BRANDING.md §6): the
 * premium placements take the dark end, the bulletin family the light end,
 * sponsors the warm neutral and events Kelp. Every pairing clears 4.5:1.
 */
export const AD_TYPE_CHIP: Record<AdType, string> = {
  HEADLINE: 'bg-tide-900 text-foam',
  FEATURE: 'bg-tide-700 text-foam',
  BULLETIN_TAKEOVER: 'bg-tide-600 text-foam',
  BULLETIN_BANNER: 'bg-tide-300 text-tide-900',
  BULLETIN_CLASSIFIED: 'bg-tide-100 text-tide-900',
  SECTION_SPONSOR: 'bg-neutral-soft text-neutral',
  FEATURED_EVENT: 'bg-success-soft text-success',
}

export function adTypeChipClass(adType: string): string {
  return AD_TYPE_CHIP[adType as AdType] ?? 'bg-neutral-soft text-neutral'
}

export function AdTypeChip({
  adType,
  section,
  className,
}: {
  adType: string
  section?: string | null
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium',
        adTypeChipClass(adType),
        className
      )}
    >
      {label(adType)}
      {section ? ` · ${label(section)}` : ''}
    </span>
  )
}
