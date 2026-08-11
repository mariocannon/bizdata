import { cn } from '@/lib/utils'
import { TideLogo } from './tide-logo'
import { TideWaves } from './tide-waves'

/**
 * The wrapper for every public-facing page: the brand's radial wash, the logo
 * and eyebrow, and the tide anchored to the foot of the viewport.
 *
 * Anything a Coastie sees before signing in belongs in here — it is what keeps
 * the sign-in screen and the two submission forms looking like The Tide rather
 * than like an admin tool (docs/BRANDING.md §2).
 */
export function BrandShell({
  title,
  intro,
  children,
  footer,
  width = 'narrow',
}: {
  title: React.ReactNode
  intro?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  width?: 'narrow' | 'wide'
}) {
  return (
    <div className="brand-wash relative min-h-screen overflow-hidden">
      {/* The waves own the bottom of the page, so the column reserves room for
          them — copy must never sit on top of the motif. */}
      <div
        className={cn(
          'page-shell relative z-10 mx-auto flex min-h-screen flex-col justify-center pt-10',
          'pb-[clamp(7rem,20vh,11rem)]',
          width === 'narrow' ? 'max-w-sm' : 'max-w-2xl'
        )}
      >
        <header className="mb-6 flex flex-col items-center gap-3 text-center">
          <TideLogo className="max-w-[6.5rem]" priority />
          <p className="eyebrow">The Coast&rsquo;s newsletter</p>
          <h1 className="text-balance text-2xl font-extrabold tracking-tight">{title}</h1>
          {intro ? (
            <p className="max-w-prose text-pretty text-sm text-muted-foreground">{intro}</p>
          ) : null}
        </header>

        {children}

        {footer ? (
          <p className="mt-6 text-center text-xs text-driftwood">{footer}</p>
        ) : null}
      </div>

      <TideWaves />
    </div>
  )
}
