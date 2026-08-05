import { Waves } from 'lucide-react'
import { CLASSIFIED_WORD_MAX, CLASSIFIED_WORD_MIN } from '@/lib/classifieds'
import { SubmissionForm } from './submission-form'

export const metadata = {
  title: 'Place a classified — The Tide',
  description:
    'Send us a classified for The Tide: a headline, 50–70 words, and how readers can reach you.',
}

/**
 * The one page in the app that anyone can open — see PUBLIC_PATHS in
 * middleware.ts. It reads nothing from the database and renders no app chrome,
 * so there is nothing here to leak: it collects a listing and posts it to
 * /api/classifieds/submit, which files it as a draft for review.
 */
export default function SubmitClassifiedPage() {
  return (
    <div className="page-shell mx-auto flex min-h-screen max-w-2xl flex-col justify-center py-10">
      <header className="mb-6 flex flex-col items-center gap-2 text-center">
        <span className="flex size-11 items-center justify-center rounded-lg bg-tide-700 text-white">
          <Waves className="size-5" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">
          Place a classified in The Tide
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Classifieds run in our weekly email to the Hibiscus Coast. Send yours
          below — a headline, {CLASSIFIED_WORD_MIN}–{CLASSIFIED_WORD_MAX} words, and
          a phone number or email so readers can reach you. We&rsquo;ll be in touch
          to confirm which issue it runs in.
        </p>
      </header>

      <SubmissionForm />

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Your contact details are printed with your listing so readers can respond —
        please only send details you&rsquo;re happy to have published.
      </p>
    </div>
  )
}
