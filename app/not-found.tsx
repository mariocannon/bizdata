import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="page-shell flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        404
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">That page doesn&apos;t exist</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The record may have been deleted, or the link is out of date.
      </p>
      <Button asChild className="mt-2">
        <Link href="/">Back to the dashboard</Link>
      </Button>
    </div>
  )
}
