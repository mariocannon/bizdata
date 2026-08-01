'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AD_TYPES, label } from '@/lib/enums'
import type { AppSettings } from '@/lib/settings'
import { updateSettings } from './actions'

export function SettingsForm({ settings }: { settings: AppSettings }) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await updateSettings(form)
      if (result.ok) {
        setErrors({})
        toast.success(result.message ?? 'Saved.')
        router.refresh()
      } else {
        setErrors(result.errors ?? {})
        toast.error(result.message)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="grid max-w-4xl gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
          <CardDescription>
            How many slots each issue carries, and where the ratio indicator sits.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            label="Bulletin slots per issue"
            htmlFor="bulletinCapacity"
            error={errors.bulletinCapacity}
            hint="Classified and Banner share these. A Takeover consumes all of them."
          >
            <Input
              id="bulletinCapacity"
              name="bulletinCapacity"
              type="number"
              min="1"
              step="1"
              defaultValue={settings.bulletinCapacity}
              aria-invalid={Boolean(errors.bulletinCapacity)}
            />
          </Field>

          <Field
            label="Soft sold-out target"
            htmlFor="soldOutTarget"
            error={errors.soldOutTarget}
            hint="Slots that count as sold out for the 3:1 content-to-ad indicator. Guidance only — it never blocks a booking."
          >
            <Input
              id="soldOutTarget"
              name="soldOutTarget"
              type="number"
              min="1"
              step="1"
              defaultValue={settings.soldOutTarget}
              aria-invalid={Boolean(errors.soldOutTarget)}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default prices</CardTitle>
          <CardDescription>
            Used to pre-fill the booking form. Any booking can still be priced
            individually.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {AD_TYPES.map((adType) => (
            <div key={adType} className="flex items-center justify-between gap-3">
              <label htmlFor={`price.${adType}`} className="text-sm font-medium">
                {label(adType)}
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  id={`price.${adType}`}
                  name={`price.${adType}`}
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={settings.defaultPrices[adType] ?? 0}
                  aria-invalid={Boolean(errors[`price.${adType}`])}
                  className="tabular w-28 text-right"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="lg:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </form>
  )
}
