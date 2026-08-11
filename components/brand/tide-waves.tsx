import { cn } from '@/lib/utils'

/**
 * The tide — the brand's signature motif. Two Sea Glass waves, the back one at
 * 45% opacity and the front at full, anchored to the foot of whatever they sit
 * in. The path data is reproduced verbatim from the brand guide; don't redraw
 * it (docs/BRANDING.md §2).
 *
 * The parent needs `position: relative` and `overflow: hidden`.
 */
export function TideWaves({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1440 220"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-[-1px] h-[clamp(80px,14vh,150px)] w-full',
        className
      )}
    >
      <path
        fill="#a2c5d3"
        opacity="0.45"
        d="M0,96 C240,160 480,32 720,64 C960,96 1200,192 1440,128 L1440,220 L0,220 Z"
      />
      <path
        fill="#a2c5d3"
        d="M0,160 C280,96 520,208 760,176 C1000,144 1240,96 1440,176 L1440,220 L0,220 Z"
      />
    </svg>
  )
}

/**
 * The compact stand-in for the logo: the wave motif in a Deep Navy tile, for
 * the places the full logo can't go — the dark sidebar, favicons, avatars.
 */
export function TideMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-navy',
        className
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 1440 220" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[55%] w-full">
        <path
          fill="#a2c5d3"
          opacity="0.45"
          d="M0,96 C240,160 480,32 720,64 C960,96 1200,192 1440,128 L1440,220 L0,220 Z"
        />
        <path
          fill="#a2c5d3"
          d="M0,160 C280,96 520,208 760,176 C1000,144 1240,96 1440,176 L1440,220 L0,220 Z"
        />
      </svg>
    </span>
  )
}
