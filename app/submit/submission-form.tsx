'use client'

import * as React from 'react'
import { CheckCircle2, ImageOff, Send, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Field } from '@/components/ui/field'
import { CLASSIFIED_CATEGORIES, label } from '@/lib/enums'
import {
  CLASSIFIED_WORD_MAX,
  countWords,
  wordCountMessage,
  wordCountState,
} from '@/lib/classifieds'
import { FEATURED_CLASSIFIED_FEE } from '@/lib/featured'
import { cn, formatMoney } from '@/lib/utils'

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

export function SubmissionForm() {
  const [pending, setPending] = React.useState(false)
  const [sent, setSent] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [message, setMessage] = React.useState<string | null>(null)
  const [body, setBody] = React.useState('')
  const [featured, setFeatured] = React.useState(false)
  const [preview, setPreview] = React.useState<string | null>(null)

  // Stamped when the form renders; the endpoint refuses submissions returned
  // faster than a person could type one.
  const startedAt = React.useRef(Date.now())
  const formRef = React.useRef<HTMLFormElement>(null)

  const words = countWords(body)
  const state = wordCountState(words)

  // Object URLs are only valid until revoked; drop the last one whenever the
  // preview moves on so repeated picks don't leak.
  React.useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  function handleImageChange(changed: React.ChangeEvent<HTMLInputElement>) {
    const selected = changed.target.files?.[0]
    setPreview(selected ? URL.createObjectURL(selected) : null)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setMessage(null)

    // Multipart rather than JSON, because a featured listing carries an image.
    // The endpoint reads the same field names either way.
    form.set('featured', featured ? 'true' : 'false')
    form.set('startedAt', String(startedAt.current))
    if (!featured) form.delete('image')

    try {
      const response = await fetch('/api/classifieds/submit', {
        method: 'POST',
        body: form,
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
          <h2 className="text-lg font-semibold">Thanks — your listing is in.</h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            We read every classified before it runs. If it needs a trim or we have a
            question, we&rsquo;ll get in touch using the details you gave us, and
            we&rsquo;ll confirm which issue it appears in.
          </p>
          {featured ? (
            <p className="max-w-prose text-sm text-muted-foreground">
              You asked to feature it, so your photo comes along with the
              listing. We&rsquo;ll send you an invoice for the{' '}
              {formatMoney(FEATURED_CLASSIFIED_FEE, true)} when we confirm the issue.
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              formRef.current?.reset()
              setBody('')
              setFeatured(false)
              setPreview(null)
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
            hint={`Up to ${CLASSIFIED_WORD_MAX} words — what it is, why it's worth a look, and anything a reader needs to know.`}
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

          {/* The one paid extra on this form. Ticking it opens the picker;
              nothing is charged here — an invoice follows once we've read the
              listing and picked an issue for it. */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-3">
            <label htmlFor="featured" className="flex cursor-pointer items-start gap-2.5">
              <Checkbox
                id="featured"
                name="featured"
                checked={featured}
                onChange={(changed) => setFeatured(changed.target.checked)}
                className="mt-0.5"
              />
              <span className="text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <Star className="size-3.5 text-steel" />
                  Feature my listing — {formatMoney(FEATURED_CLASSIFIED_FEE, true)}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Add a photo and your listing runs with it, at the top of the
                  classifieds. We&rsquo;ll invoice you once we&rsquo;ve confirmed
                  the issue — nothing to pay now.
                </span>
              </span>
            </label>

            {featured ? (
              <div className="flex flex-col gap-3 border-t border-border pt-3">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt="Your photo"
                    className="max-h-48 w-full rounded border border-border bg-muted object-contain"
                  />
                ) : (
                  <div className="flex h-24 flex-col items-center justify-center gap-1.5 rounded border border-dashed border-border text-xs text-muted-foreground">
                    <ImageOff className="size-5" />
                    No photo yet
                  </div>
                )}

                <Field
                  label="Your photo"
                  htmlFor="image"
                  required
                  error={errors.image}
                  hint="PNG, JPG, GIF, WEBP or SVG, up to 5MB. A landscape photo looks best."
                >
                  <Input
                    id="image"
                    name="image"
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                    onChange={handleImageChange}
                    aria-invalid={Boolean(errors.image)}
                  />
                </Field>
              </div>
            ) : null}
          </div>

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
