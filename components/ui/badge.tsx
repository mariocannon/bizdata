import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        // Sea Glass is a fill colour, never a text colour — the label takes
        // Deep Navy off the ramp so it clears contrast (docs/BRANDING.md §1).
        default: 'border-transparent bg-tide-100 text-tide-800',
        neutral: 'border-border bg-muted text-muted-foreground',
        outline: 'border-border text-foreground',
        success: 'border-transparent bg-success-soft text-success',
        warning: 'border-transparent bg-attention-soft text-attention',
        danger: 'border-transparent bg-danger-soft text-danger',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
