'use client'

import * as React from 'react'
import { CheckCircle2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Field } from '@/components/ui/field'
import { EVENT_CATEGORIES, label } from '@/lib/enums'
import { countWords, wordCountMessage, wordCountState } from '@/lib/classifieds'
import { EVENT_WORD_MAX } from '@/lib/events'
import { cn } from '@/lib/utils'

const COUNTER_STYLES: Record<string, string> = {
  empty: 'text-muted-foreground',
  ok: 'text-success',
  long: 'text-attention',
}

type Response = {
  ok: boolean
  message?: string
  errors?: Record<string, string>
}

export function EventSubmissionForm() {
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
      const response = await fetch('/api/events/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: form.get('title'),
          body: form.get('body'),
          startDate: form.get('startDate'),
          startTime: form.get('startTime'),
          endDate: form.get('endDate'),
          endTime: form.get('endTime'),
          location: form.get('location'),
          category: form.get('category'),
          contactName: form.get('contactName'),
          contactEmail: form.get('contactEmail'),
          contactPhone: form.get('contactPhone'),
          ticketUrl: form.get('ticketUrl'),
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
          <CheckCircle2 className="size-8 text-success" />
          <h2 className="text-lg font-semibold">Thanks — your event is in.</h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            We read every listing before it runs. If it needs a trim or we have a
            question we&rsquo;ll get in touch using the details you gave us, and
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
            Send another event
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
            label="Event name"
            htmlFor="title"
            required
            error={errors.title}
            hint="What readers see first."
          >
            <Input
              id="title"
              name="title"
              placeholder="Ōrewa Night Market"
              maxLength={120}
              aria-invalid={Boolean(errors.title)}
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" htmlFor="startDate" required error={errors.startDate}>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                aria-invalid={Boolean(errors.startDate)}
                required
              />
            </Field>

            <Field
              label="Start time"
              htmlFor="startTime"
              error={errors.startTime}
              hint="Leave blank if it runs all day."
            >
              <Input id="startTime" name="startTime" type="time" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="End date"
              htmlFor="endDate"
              error={errors.endDate}
              hint="Only if it runs past one day."
            >
              <Input
                id="endDate"
                name="endDate"
                type="date"
                aria-invalid={Boolean(errors.endDate)}
              />
            </Field>

            <Field label="End time" htmlFor="endTime" error={errors.endTime}>
              <Input id="endTime" name="endTime" type="time" />
            </Field>
          </div>

          <Field
            label="Where"
            htmlFor="location"
            required
            error={errors.location}
            hint="Venue and suburb, so people can find it."
          >
            <Input
              id="location"
              name="location"
              placeholder="Ōrewa Community Centre, Ōrewa"
              maxLength={160}
              aria-invalid={Boolean(errors.location)}
              required
            />
          </Field>

          <Field
            label="About the event"
            htmlFor="body"
            required
            error={errors.body}
            hint={`Up to ${EVENT_WORD_MAX} words — what's on, who it's for, and anything people need to know before they turn up.`}
          >
            <Textarea
              id="body"
              name="body"
              value={body}
              onChange={(changed) => setBody(changed.target.value)}
              rows={7}
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
            <Select id="category" name="category" defaultValue="COMMUNITY">
              {EVENT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {label(category)}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Tickets or more info"
            htmlFor="ticketUrl"
            error={errors.ticketUrl}
            hint="Optional — a full link starting http:// or https://"
          >
            <Input
              id="ticketUrl"
              name="ticketUrl"
              type="url"
              placeholder="https://example.co.nz/tickets"
              aria-invalid={Boolean(errors.ticketUrl)}
            />
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
            <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          {message ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {message}
            </p>
          ) : null}

          <Button type="submit" disabled={pending}>
            <Send />
            {pending ? 'Sending…' : 'Send my event'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
