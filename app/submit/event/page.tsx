import Link from 'next/link'
import { EVENT_WORD_MAX } from '@/lib/events'
import { BrandShell } from '@/components/brand/brand-shell'
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
    <BrandShell
      width="wide"
      title="List an event in The Tide"
      intro={
        <>
          What&rsquo;s on goes out to Coasties in our weekly email. Tell us when and
          where it is, up to {EVENT_WORD_MAX} words about it, and how people can
          reach you. We&rsquo;ll confirm which issue it appears in.
        </>
      }
      footer={
        <>
          Your contact details are printed with the listing so readers can respond —
          please only send details you&rsquo;re happy to have published.{' '}
          <Link href="/submit" className="font-medium text-steel hover:underline">
            Selling something instead? Place a classified.
          </Link>
        </>
      }
    >
      <EventSubmissionForm />
    </BrandShell>
  )
}
