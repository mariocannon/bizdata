import { redirect } from 'next/navigation'
import { gateMode } from '@/lib/auth'
import { BrandShell } from '@/components/brand/brand-shell'
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
    <BrandShell
      title="Ad Manager"
      intro="Enter the password to open the ad manager."
    >
      <LoginForm next={next} />
    </BrandShell>
  )
}
