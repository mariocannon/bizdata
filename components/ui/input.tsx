import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors',
        // Focus per the brand guide §5: the border goes Steel Blue behind a
        // 3px Sea Glass glow. Placeholders are Mist.
        'placeholder:text-mist focus-visible:outline-none focus-visible:border-steel',
        'focus-visible:ring-[3px] focus-visible:ring-seaglass/55 focus-visible:ring-offset-0',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/30',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export { Input }
