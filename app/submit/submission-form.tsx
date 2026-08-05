'use client'

import * as React from 'react'
import { CheckCircle2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Field } from '@/components/ui/field'
import { CLASSIFIED_CATEGORIES, label } from '@/lib/enums'
import {
  CLASSIFIED_WORD_MAX,
  CLASSIFIED_WORD_MIN,
  countWords,
  wordCountMessage,
  wordCountState,
} from '@/lib/classifieds'
import { cn } from '@/lib/utils'

const COUNTER_STYLES: Record<string, string> = {
  empty: 'text-muted-foreground',
  short: 'text-amber-700',
  ok: 'text-emerald-700',
  long: 'text-amber-700',
}

type Response = {
  ok: boolean
  message?: string
  errors?: Record<string, string>
}

export function SubmissionForm() {
  const [pending, setPending] = React.useState(false)
  const [sent, setSent] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [message, setMessage] = React.useState<string | null>(null)
  const [body, setBody] = React.useState('')

  // Stamped when the form renders; the endpoint refuses submissions returned
  // faster than a person could type one.
  const startedAt = React.useRef(Date.now())
  const formRef = React.useRef<HTMLFormElement>(null)

  const words = countWords(body)
  const state = wordCountState(words)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setMessage(null)

    try {
      const response = await fetch('/api/classifieds/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          headline: form.get('headline'),
          body: form.get('body'),
          category: form.get('category'),
          contactName: form.get('contactName'),
          contactEmail: form.get('contactEmail'),
          contactPhone: form.get('contactPhone'),
          website: form.get('website'),
          startedAt: startedAt.current,
        }),
      })

      const result: Response = await response.json().catch(() => ({ ok: false }))

      if (result.ok) {
        setErrors({})
        setSent(true)
      } else {
        setErrors(result.errors ?? {})
        setMessage(result.message ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setMessage('Could not reach us just now. Please check your connection and retry.')
    } finally {
      setPending(false)
    }
  }

  if (sent) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <CheckCircle2 className="size-8 text-emerald-600" />
          <h2 className="text-lg font-semibold">Thanks — your listing is in.</h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            We read every classified before it runs. If it needs a trim or we have a
            question, we&rsquo;ll get in touch using the details you gave us, and
            we&rsquo;ll confirm which issue it appears in.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              formRef.current?.reset()
              setBody('')
              setSent(false)
              setMessage(null)
              startedAt.current = Date.now()
            }}
          >
            Send another listing
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field
            label="Headline"
            htmlFor="headline"
            required
            error={errors.headline}
            hint="A short line readers see first."
          >
            <Input
              id="headline"
              name="headline"
              placeholder="Tidy 4.2m alloy runabout, Ōrewa"
              maxLength={80}
              aria-invalid={Boolean(errors.headline)}
              required
            />
          </Field>

          <Field
            label="Your listing"
            htmlFor="body"
            required
            error={errors.body}
            hint={`Between ${CLASSIFIED_WORD_MIN} and ${CLASSIFIED_WORD_MAX} words — enough to say what it is, why it's worth a look, and anything a reader needs to know.`}
          >
            <Textarea
              id="body"
              name="body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={8}
              aria-invalid={Boolean(errors.body)}
              aria-describedby="body-count"
              required
            />
            <p
              id="body-count"
              aria-live="polite"
              className={cn('tabular text-xs font-medium', COUNTER_STYLES[state])}
            >
              {wordCountMessage(words)}
            </p>
          </Field>

          <Field label="Category" htmlFor="category" required error={errors.category}>
            <Select id="category" name="category" defaultValue="FOR_SALE">
              {CLASSIFIED_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {label(category)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Your name" htmlFor="contactName" required error={errors.contactName}>
            <Input
              id="contactName"
              name="contactName"
              autoComplete="name"
              aria-invalid={Boolean(errors.contactName)}
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Email"
              htmlFor="contactEmail"
              error={errors.contactEmail}
              hint="Email or phone — whichever you'd like readers to use."
            >
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(errors.contactEmail)}
              />
            </Field>

            <Field label="Phone" htmlFor="contactPhone" error={errors.contactPhone}>
              <Input
                id="contactPhone"
                name="contactPhone"
                type="tel"
                autoComplete="tel"
                aria-invalid={Boolean(errors.contactPhone)}
              />
            </Field>
          </div>

          {/* Honeypot: hidden from people, filled in by bots. Not display:none —
              some bots skip those — and kept out of the tab order and the
              accessibility tree so nobody real ever meets it. */}
          <div aria-hidden className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {message ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {message}
            </p>
          ) : null}

          <Button type="submit" disabled={pending}>
            <Send />
            {pending ? 'Sending…' : 'Send my listing'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
