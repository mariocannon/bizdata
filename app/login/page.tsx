import { redirect } from 'next/navigation'
import { Waves } from 'lucide-react'
import { gateMode } from '@/lib/auth'
import { LoginForm } from './login-form'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Sign in — The Tide Ad Manager' }

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string }
}) {
  // With no password configured there is nothing to sign in to.
  if (gateMode() === 'disabled') redirect('/')

  // Only ever bounce back to a path on this app, never to another origin.
  const next =
    searchParams.next && searchParams.next.startsWith('/') && !searchParams.next.startsWith('//')
      ? searchParams.next
      : '/'

  return (
    <div className="page-shell flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex size-11 items-center justify-center rounded-lg bg-tide-700 text-white">
            <Waves className="size-5" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight">The Tide — Ad Manager</h1>
          <p className="text-sm text-muted-foreground">
            Enter the password to open the ad manager.
          </p>
        </div>

        <LoginForm next={next} />
      </div>
    </div>
  )
}
