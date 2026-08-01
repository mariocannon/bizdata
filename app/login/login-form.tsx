'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { Card, CardContent } from '@/components/ui/card'
import { signIn } from './actions'

export function LoginForm({ next }: { next: string }) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await signIn(form)
      if (result.ok) {
        setError(null)
        router.replace(next)
        router.refresh()
      } else {
        setError(result.message)
      }
    })
  }

  return (
    <Card>
      <CardContent className="p-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Password" htmlFor="password" error={error ?? undefined}>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(error)}
              autoFocus
              required
            />
          </Field>

          <Button type="submit" disabled={pending}>
            <LogIn />
            {pending ? 'Checking…' : 'Sign in'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
