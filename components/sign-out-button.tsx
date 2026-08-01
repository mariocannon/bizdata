'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { signOut } from '@/app/login/actions'

export function SignOutButton() {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await signOut()
          router.replace('/login')
          router.refresh()
        })
      }
      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-tide-100/70 transition-colors hover:bg-tide-800/60 hover:text-white disabled:opacity-60"
    >
      <LogOut className="size-4 shrink-0" />
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
