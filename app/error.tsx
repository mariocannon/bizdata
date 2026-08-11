'use client'

import * as React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="page-shell flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <AlertTriangle className="size-6 text-attention" />
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {error.message || 'An unexpected error occurred while loading this page.'}
      </p>
      <Button onClick={reset} className="mt-2">
        Try again
      </Button>
    </div>
  )
}
