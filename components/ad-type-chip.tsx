import { label, type AdType } from '@/lib/enums'
import { cn } from '@/lib/utils'

/** One colour per ad type, shared by the bookings calendar and issue views. */
export const AD_TYPE_CHIP: Record<AdType, string> = {
  HEADLINE: 'bg-tide-700 text-white',
  FEATURE: 'bg-tide-500 text-white',
  BULLETIN_CLASSIFIED: 'bg-sky-100 text-sky-900',
  BULLETIN_BANNER: 'bg-sky-200 text-sky-900',
  BULLETIN_TAKEOVER: 'bg-sky-700 text-white',
  SECTION_SPONSOR: 'bg-indigo-100 text-indigo-900',
  FEATURED_EVENT: 'bg-emerald-100 text-emerald-900',
}

export function adTypeChipClass(adType: string): string {
  return AD_TYPE_CHIP[adType as AdType] ?? 'bg-slate-100 text-slate-800'
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
