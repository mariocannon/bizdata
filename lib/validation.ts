import { z } from 'zod'
import {
  adTypeSchema,
  advertiserCategorySchema,
  advertiserStatusSchema,
  bookingStatusSchema,
  issueStatusSchema,
  paidStatusSchema,
  sectionSlotSchema,
} from '@/lib/enums'

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
