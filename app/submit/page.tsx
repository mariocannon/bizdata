import Link from 'next/link'
import { CLASSIFIED_WORD_MAX } from '@/lib/classifieds'
import { BrandShell } from '@/components/brand/brand-shell'
import { SubmissionForm } from './submission-form'

export const metadata = {
  title: 'Place a classified — The Tide',
  description:
    'Send us a classified for The Tide: a headline, up to 70 words, and how readers can reach you.',
}

/**
 * The one page in the app that anyone can open — see PUBLIC_PATHS in
 * middleware.ts. It reads nothing from the database and renders no app chrome,
 * so there is nothing here to leak: it collects a listing and posts it to
 * /api/classifieds/submit, which files it as a draft for review.
 */
export default function SubmitClassifiedPage() {
  return (
    <BrandShell
      width="wide"
      title="Place a classified in The Tide"
      intro={
        <>
          Classifieds go out to Coasties in our weekly email. Send yours below — a
          headline, up to {CLASSIFIED_WORD_MAX} words, and a phone number or email
          so readers can reach you. We&rsquo;ll be in touch to confirm which issue
          it runs in.
        </>
      }
      footer={
        <>
          <Link href="/submit/event" className="font-medium text-steel hover:underline">
            Running an event? List it here instead.
          </Link>
          <br />
          Your contact details are printed with your listing so readers can respond —
          please only send details you&rsquo;re happy to have published.
        </>
      }
    >
      <SubmissionForm />
    </BrandShell>
  )
}
