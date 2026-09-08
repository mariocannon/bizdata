import { z } from 'zod'
import {
  adTypeSchema,
  advertiserCategorySchema,
  advertiserStatusSchema,
  bookingStatusSchema,
  classifiedCategorySchema,
  classifiedStatusSchema,
  directoryCategorySchema,
  directoryTownSchema,
  eventCategorySchema,
  eventStatusSchema,
  issueStatusSchema,
  jobCategorySchema,
  jobStatusSchema,
  jobTierSchema,
  jobTypeSchema,
  paidStatusSchema,
  sectionSlotSchema,
} from '@/lib/enums'
import { isUpcoming, requiresWordCount as eventRequiresWordCount } from '@/lib/events'
import { JOB_WORD_MAX, requiresWordCount as jobRequiresWordCount } from '@/lib/jobs'
import { parseDateTimeInput } from '@/lib/utils'
import {
  CLASSIFIED_WORD_MAX,
  countWords,
  isWordCountValid,
  requiresWordCount,
  wordCountError,
  wordCountMessage,
} from '@/lib/classifieds'

/** Turns '' into undefined so optional text fields clear cleanly. */
const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === '' ? undefined : v))
  .optional()

const optionalUrl = z
  .string()
  .trim()
  .transform((v) => (v === '' ? undefined : v))
  .optional()
  .refine(
    (v) => v === undefined || /^https?:\/\/.+/i.test(v),
    'Enter a full URL starting with http:// or https://'
  )

const optionalEmail = z
  .string()
  .trim()
  .transform((v) => (v === '' ? undefined : v))
  .optional()
  .refine(
    (v) => v === undefined || z.string().email().safeParse(v).success,
    'Enter a valid email address'
  )

const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === '' ? undefined : v))
  .optional()

export const advertiserSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Name is required').max(120),
  category: advertiserCategorySchema,
  status: advertiserStatusSchema,
  contactName: optionalText,
  email: optionalEmail,
  phone: optionalText,
  website: optionalUrl,
  reviewsChecked: z.coerce.boolean().default(false),
  lastContacted: optionalDate,
  notes: optionalText,
})

export type AdvertiserInput = z.input<typeof advertiserSchema>
export type AdvertiserValues = z.output<typeof advertiserSchema>

export const issueSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, 'Title is required').max(160),
  publishDate: z.string().trim().min(1, 'Publish date is required'),
  status: issueStatusSchema,
  theme: optionalText,
})

export type IssueValues = z.output<typeof issueSchema>

export const bookingSchema = z
  .object({
    id: z.string().optional(),
    label: optionalText,
    advertiserId: z.string().trim().min(1, 'Choose an advertiser'),
    issueId: z.string().trim().min(1, 'Choose an issue'),
    adType: adTypeSchema,
    section: sectionSlotSchema.optional().or(z.literal('').transform(() => undefined)),
    price: z.coerce.number().min(0, 'Price cannot be negative').default(0),
    status: bookingStatusSchema,
    paid: paidStatusSchema,
    ctaUrl: optionalUrl,
    copy: optionalText,
    creativeUrl: optionalText,
    notes: optionalText,
  })
  .superRefine((data, ctx) => {
    if (data.adType === 'SECTION_SPONSOR' && !data.section) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['section'],
        message: 'Pick which section this sponsor runs in',
      })
    }
  })

export type BookingValues = z.output<typeof bookingSchema>

export const classifiedSchema = z
  .object({
    id: z.string().optional(),
    headline: z
      .string()
      .trim()
      .min(1, 'Headline is required')
      .max(80, 'Keep the headline to 80 characters or fewer'),
    body: z.string().trim().min(1, 'Write the listing copy'),
    category: classifiedCategorySchema,
    status: classifiedStatusSchema,
    contactName: optionalText,
    contactEmail: optionalEmail,
    contactPhone: optionalText,
    issueId: optionalText,
    notes: optionalText,
    // The paid upgrade, exactly as an event carries it. The image itself never
    // reaches this schema — a File can't be validated as text — so the action
    // checks that a featured listing has one, either newly uploaded or already
    // stored in `imageUrl`.
    featured: z.boolean().default(false),
    imageUrl: optionalText,
    featuredPaid: paidStatusSchema.default('UNPAID'),
  })
  .superRefine((data, ctx) => {
    // "Contact or email" — either will do, but a listing nobody can reply to
    // is not worth printing.
    if (!data.contactEmail && !data.contactPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contactEmail'],
        message: 'Add an email or a phone number so readers can reply',
      })
    }

    // Drafts may sit outside the word range; approving or publishing enforces it.
    if (requiresWordCount(data.status)) {
      const words = countWords(data.body)
      if (!isWordCountValid(words)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['body'],
          message: wordCountError(words, data.status),
        })
      }
    }
  })

export type ClassifiedValues = z.output<typeof classifiedSchema>

/**
 * What the public form at /submit accepts. Separate from `classifiedSchema` on
 * purpose — this one is the contract with strangers, so it is narrower:
 *
 *   - No status, source or issue. Submissions always land as an unassigned
 *     draft; nothing off the internet gets to set its own state.
 *   - The word cap is enforced outright rather than only on approval. A
 *     submitter writing to the brief is the whole point of sending them here.
 *   - Lengths are capped so a hostile payload can't be huge.
 */
export const publicClassifiedSchema = z
  .object({
    headline: z
      .string()
      .trim()
      .min(1, 'Give your listing a headline')
      .max(80, 'Keep the headline to 80 characters or fewer'),
    body: z
      .string()
      .trim()
      .min(1, 'Write your listing')
      .max(2000, 'That is longer than a classified can be'),
    category: classifiedCategorySchema,
    contactName: z
      .string()
      .trim()
      .min(1, 'Tell us who to credit this to')
      .max(120, 'That name is too long'),
    contactEmail: optionalEmail,
    contactPhone: optionalText.refine(
      (v) => v === undefined || v.length <= 40,
      'That phone number is too long'
    ),
    // Asking for the upgrade is the submitter's to make; whether it has been
    // paid for is not, so `featuredPaid` is absent here the same way `status`
    // is. A submitted featured listing always lands unpaid.
    featured: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (!data.contactEmail && !data.contactPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contactEmail'],
        message: 'Add an email or a phone number so readers can reply',
      })
    }

    const words = countWords(data.body)
    if (!isWordCountValid(words)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['body'],
        message: `Listings run to ${CLASSIFIED_WORD_MAX} words at most. ${wordCountMessage(words)}.`,
      })
    }
  })

export type PublicClassifiedValues = z.output<typeof publicClassifiedSchema>

/**
 * An event listing. The copy rules match a classified — same word cap, flagged
 * on drafts and enforced on approval — so only the dates are new.
 *
 * Dates arrive as a `yyyy-MM-dd` date plus an optional `HH:mm` time, kept
 * separate so "on Saturday" with no time is expressible. The action combines
 * them; blank time means midnight, which reads as no time given.
 */
export const eventSchema = z
  .object({
    id: z.string().optional(),
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(120, 'Keep the title to 120 characters or fewer'),
    body: z.string().trim().min(1, 'Write the listing copy'),
    startDate: z.string().trim().min(1, 'A start date is required'),
    startTime: optionalText,
    endDate: optionalText,
    endTime: optionalText,
    location: optionalText,
    category: eventCategorySchema,
    status: eventStatusSchema,
    contactName: optionalText,
    contactEmail: optionalEmail,
    contactPhone: optionalText,
    ticketUrl: optionalUrl,
    issueId: optionalText,
    notes: optionalText,
    // The paid upgrade. The image itself never reaches this schema — a File
    // can't be validated as text — so the action checks that a featured
    // listing has one, either newly uploaded or already stored in `imageUrl`.
    featured: z.boolean().default(false),
    imageUrl: optionalText,
    featuredPaid: paidStatusSchema.default('UNPAID'),
  })
  .superRefine((data, ctx) => {
    // A time without a date has nothing to attach itself to.
    if (data.endTime && !data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'Add an end date to go with that time',
      })
    }

    if (data.endDate) {
      const starts = parseDateTimeInput(data.startDate, data.startTime)
      const ends = parseDateTimeInput(data.endDate, data.endTime)
      // An end at midnight is a date with no time, so it covers that whole day.
      const endOfEnd =
        data.endTime && data.endTime.trim() !== ''
          ? ends
          : new Date(ends.getFullYear(), ends.getMonth(), ends.getDate(), 23, 59, 59)

      if (endOfEnd < starts) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endDate'],
          message: 'The event cannot finish before it starts',
        })
      }
    }

    if (eventRequiresWordCount(data.status)) {
      const words = countWords(data.body)
      if (!isWordCountValid(words)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['body'],
          message: wordCountError(words, data.status),
        })
      }
    }
  })

export type EventValues = z.output<typeof eventSchema>

/**
 * What the public form at /submit/event accepts — the same contract-with-
 * strangers shape as `publicClassifiedSchema`:
 *
 *   - No status, source or issue. Submissions always land as an unassigned
 *     draft; nothing off the internet gets to set its own state.
 *   - The word cap is enforced outright rather than only on approval.
 *   - Where and when are required, because an event listing without them is
 *     not a listing, and the date has to still be ahead of us.
 */
export const publicEventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Give your event a name')
      .max(120, 'Keep the name to 120 characters or fewer'),
    body: z
      .string()
      .trim()
      .min(1, 'Tell us about your event')
      .max(2000, 'That is longer than a listing can be'),
    startDate: z.string().trim().min(1, 'When is it on?'),
    startTime: optionalText,
    endDate: optionalText,
    endTime: optionalText,
    location: z
      .string()
      .trim()
      .min(1, 'Where is it on?')
      .max(160, 'That is too long for a venue'),
    category: eventCategorySchema,
    contactName: z
      .string()
      .trim()
      .min(1, 'Tell us who to credit this to')
      .max(120, 'That name is too long'),
    contactEmail: optionalEmail,
    contactPhone: optionalText.refine(
      (v) => v === undefined || v.length <= 40,
      'That phone number is too long'
    ),
    ticketUrl: optionalUrl,
    // Asking for the upgrade is the submitter's to make; whether it has been
    // paid for is not, so `featuredPaid` is absent here the same way `status`
    // is. A submitted featured listing always lands unpaid.
    featured: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (!data.contactEmail && !data.contactPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contactEmail'],
        message: 'Add an email or a phone number so readers can reply',
      })
    }

    const words = countWords(data.body)
    if (!isWordCountValid(words)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['body'],
        message: `Listings run to ${CLASSIFIED_WORD_MAX} words at most. ${wordCountMessage(words)}.`,
      })
    }

    const starts = parseDateTimeInput(data.startDate, data.startTime)
    const ends = data.endDate ? parseDateTimeInput(data.endDate, data.endTime) : null

    if (data.endTime && !data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'Add an end date to go with that time',
      })
    }

    if (ends) {
      const endOfEnd =
        data.endTime && data.endTime.trim() !== ''
          ? ends
          : new Date(ends.getFullYear(), ends.getMonth(), ends.getDate(), 23, 59, 59)
      if (endOfEnd < starts) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endDate'],
          message: 'The event cannot finish before it starts',
        })
      }
    }

    // No point collecting something that has already happened.
    if (!isUpcoming(starts, ends)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startDate'],
        message: 'That date has already been — check the year, or send us the next one',
      })
    }
  })

export type PublicEventValues = z.output<typeof publicEventSchema>

/**
 * A business directory listing (app/(app)/directory). Unlike Classified/Event
 * there is no status or source here — no draft/approval workflow, no public
 * submission path, everything the operator adds is meant to go live.
 *
 * The 10-per-category cap and the one-featured-per-category invariant are
 * enforced in the server action against the database, not here — a schema
 * can't see the rest of the table.
 *
 * `blurb` has a 61-character floor rather than the usual "no minimum": it
 * mirrors thetidelanding's own Playwright suite, which rejects anything at or
 * under 60 characters as too short to read as a recommendation. Keeping the
 * same floor here means a listing typed in never fails thetidelanding's build.
 */
export const directoryListingSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Name is required').max(160),
  category: directoryCategorySchema,
  town: directoryTownSchema,
  blurb: z
    .string()
    .trim()
    .min(61, 'Write at least 61 characters — anything shorter reads as too thin to be a recommendation')
    .max(600, 'Keep the blurb to 600 characters or fewer'),
  phone: optionalText,
  url: optionalUrl,
  featured: z.boolean().default(false),
})

export type DirectoryListingValues = z.output<typeof directoryListingSchema>

/**
 * A job listing (app/(app)/jobs). Column for column a Classified with a hire on
 * it — same word cap, flagged on drafts and enforced on approval — so what's
 * new is the hire (employer, jobType, town, pay, applyUrl), the run (closesAt),
 * and that the base listing is paid: one `tier`, one snapshotted `price` (set
 * in the action from lib/jobs.ts priceForTier, never from the form), one
 * `paid`. See prisma/schema.prisma.
 *
 * The FEATURED tier's logo, like a featured classified's image, is checked in
 * the server action rather than here — a File can't be validated as text, and a
 * staff draft is allowed to not have one yet.
 */
export const jobSchema = z
  .object({
    id: z.string().optional(),
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(120, 'Keep the title to 120 characters or fewer'),
    employer: z
      .string()
      .trim()
      .min(1, "Say who's hiring")
      .max(120, 'That employer name is too long'),
    body: z.string().trim().min(1, 'Write the listing copy'),
    category: jobCategorySchema,
    jobType: jobTypeSchema,
    town: directoryTownSchema,
    pay: optionalText.refine(
      (v) => v === undefined || v.length <= 60,
      'Keep the pay line short'
    ),
    applyUrl: optionalUrl,
    status: jobStatusSchema,
    tier: jobTierSchema,
    paid: paidStatusSchema,
    logoUrl: optionalText,
    closesAt: z.string().trim().min(1, 'A close date is required'),
    contactName: optionalText,
    contactEmail: optionalEmail,
    contactPhone: optionalText,
    issueId: optionalText,
    notes: optionalText,
  })
  .superRefine((data, ctx) => {
    // A listing nobody can reply to is not worth printing.
    if (!data.contactEmail && !data.contactPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contactEmail'],
        message: 'Add an email or a phone number so applicants can reply',
      })
    }

    // Drafts may run long; approving or publishing enforces the cap.
    if (jobRequiresWordCount(data.status)) {
      const words = countWords(data.body)
      if (!isWordCountValid(words)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['body'],
          message: wordCountError(words, data.status),
        })
      }
    }
  })

export type JobValues = z.output<typeof jobSchema>

/**
 * What the public "post a role" form accepts. Separate from `jobSchema` on
 * purpose — this is the contract with strangers, so it is narrower and mirrors
 * `publicClassifiedSchema`:
 *
 *   - No status, source, issue, price or close date. The server sets those:
 *     an unassigned DRAFT from PUBLIC, priced from the tier via lib/jobs.ts,
 *     closing JOB_RUN_DAYS out. Nothing off a Stripe redirect gets to set its
 *     own state or its own price.
 *   - `logoUrl` is optional and only meaningful for the FEATURED tier — the
 *     form uploads the employer logo straight to storage and passes the URL.
 *     A Featured listing without one is still fine; the operator adds it later.
 *     The public submission RLS policy pins a non-null value to our own
 *     storage bucket, the same way featured classifieds/events do their photo.
 *   - The word cap is enforced outright rather than only on approval.
 *   - Lengths are capped so a hostile payload can't be huge.
 *
 * `tier` is the submitter's to state — they reached this form from a paid
 * Stripe link for that tier — but the money is settled by the operator against
 * the Stripe dashboard, so the row always lands `paid = 'UNPAID'`.
 */
export const publicJobSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Give the role a title')
      .max(120, 'Keep the title to 120 characters or fewer'),
    employer: z
      .string()
      .trim()
      .min(1, "Tell us who's hiring")
      .max(120, 'That employer name is too long'),
    body: z
      .string()
      .trim()
      .min(1, 'Describe the role')
      .max(2000, 'That is longer than a listing can be'),
    category: jobCategorySchema,
    jobType: jobTypeSchema,
    town: directoryTownSchema,
    pay: optionalText.refine(
      (v) => v === undefined || v.length <= 60,
      'Keep the pay line short'
    ),
    applyUrl: optionalUrl,
    contactName: z
      .string()
      .trim()
      .min(1, 'Tell us who applicants should contact')
      .max(120, 'That name is too long'),
    contactEmail: optionalEmail,
    contactPhone: optionalText.refine(
      (v) => v === undefined || v.length <= 40,
      'That phone number is too long'
    ),
    tier: jobTierSchema,
    logoUrl: optionalUrl,
  })
  .superRefine((data, ctx) => {
    if (!data.contactEmail && !data.contactPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contactEmail'],
        message: 'Add an email or a phone number so applicants can reply',
      })
    }

    // A logo belongs to the FEATURED tier only — mirrors the submission RLS
    // policy, which lets a non-null logoUrl through solely for FEATURED.
    if (data.logoUrl && data.tier !== 'FEATURED') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['logoUrl'],
        message: 'Only a featured listing carries an employer logo',
      })
    }

    const words = countWords(data.body)
    if (!isWordCountValid(words)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['body'],
        message: `Listings run to ${JOB_WORD_MAX} words at most. ${wordCountMessage(words)}.`,
      })
    }
  })

export type PublicJobValues = z.output<typeof publicJobSchema>

export const advertiserStatusChangeSchema = z.object({
  id: z.string().min(1),
  status: advertiserStatusSchema,
})

/** Flattens a ZodError into `{ field: message }` for inline form errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form'
    if (!errors[key]) errors[key] = issue.message
  }
  return errors
}
