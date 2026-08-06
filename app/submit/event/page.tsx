import Link from 'next/link'
import { Waves } from 'lucide-react'
import { EVENT_WORD_MAX } from '@/lib/events'
import { EventSubmissionForm } from './event-submission-form'

export const metadata = {
  title: 'List an event — The Tide',
  description:
    "Tell us about a Hibiscus Coast event and we'll consider it for The Tide's what's-on section.",
}

/**
 * Public, like /submit — see PUBLIC_PATHS in middleware.ts. It reads nothing
 * from the database and renders no app chrome: it collects an event and posts
 * it to /api/events/submit, which files it as a draft for review.
 */
export default function SubmitEventPage() {
  return (
    <div className="page-shell mx-auto flex min-h-screen max-w-2xl flex-col justify-center py-10">
      <header className="mb-6 flex flex-col items-center gap-2 text-center">
        <span className="flex size-11 items-center justify-center rounded-lg bg-tide-700 text-white">
          <Waves className="size-5" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">
          List an event in The Tide
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          What&rsquo;s on runs in our weekly email to the Hibiscus Coast. Tell us
          when and where it is, up to {EVENT_WORD_MAX} words about it, and how
          people can reach you. We&rsquo;ll confirm which issue it appears in.
        </p>
      </header>

      <EventSubmissionForm />

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Your contact details are printed with the listing so readers can respond —
        please only send details you&rsquo;re happy to have published.{' '}
        <Link href="/submit" className="text-primary hover:underline">
          Selling something instead? Place a classified.
        </Link>
      </p>
    </div>
  )
}
