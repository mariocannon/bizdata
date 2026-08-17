import { z } from 'zod'
import {
  adTypeSchema,
  advertiserCategorySchema,
  advertiserStatusSchema,
  bookingStatusSchema,
  classifiedCategorySchema,
  classifiedStatusSchema,
  eventCategorySchema,
  eventStatusSchema,
  issueStatusSchema,
  paidStatusSchema,
  sectionSlotSchema,
} from '@/lib/enums'
import { isUpcoming, requiresWordCount as eventRequiresWordCount } from '@/lib/events'
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
