import { prisma } from '@/lib/db'
import {
  BULLETIN_AD_TYPES,
  SECTION_SLOTS,
  label,
  type AdType,
  type SectionSlot,
} from '@/lib/enums'
import { getSettings } from '@/lib/settings'

/**
 * Per-issue inventory. Both the issue detail and the dashboard read this same
 * report, so the numbers can never disagree.
 */
export type CapacityReport = {
  headline: { sold: number; cap: number }
  feature: { sold: number; cap: number }
  featuredEvent: { sold: number; cap: number }
  bulletin: { sold: number; cap: number; takeover: boolean }
  sections: Record<string, { sold: number; cap: number }> // per SectionSlot
  oversold: boolean
  /** Total slots sold across every group. */
  totalSold: number
  /** Total slots available across every group. */
  totalCap: number
}

/** The minimum shape needed to count a booking against capacity. */
export type BookingLike = {
  id?: string
  adType: string
  section?: string | null
  status: string
}

/** A booking being created or edited, checked before it is written. */
export type DraftBooking = {
  /** Set when editing — the existing row is excluded from the counts. */
  id?: string
  adType: AdType
  section?: SectionSlot | null
  status: string
}

export type CapacityCheck = { ok: boolean; reason?: string }

export const SINGLE_SLOT_CAP = 1
export const SECTION_CAP = 1

function emptySections(): Record<string, { sold: number; cap: number }> {
  const sections: Record<string, { sold: number; cap: number }> = {}
  for (const slot of SECTION_SLOTS) sections[slot] = { sold: 0, cap: SECTION_CAP }
  return sections
}

/** Bookings that occupy inventory: everything except CANCELLED. */
export function countsAgainstCapacity(booking: BookingLike): boolean {
  return booking.status !== 'CANCELLED'
}

/**
 * Pure computation — given the bookings on an issue, produce the report.
 * Kept free of I/O so the dashboard can batch-load bookings once and build
 * reports for many issues without extra queries.
 */
export function buildCapacityReport(
  bookings: BookingLike[],
  bulletinCap: number
): CapacityReport {
  const live = bookings.filter(countsAgainstCapacity)

  const count = (adType: AdType) => live.filter((b) => b.adType === adType).length

  const takeovers = count('BULLETIN_TAKEOVER')
  const otherBulletin =
    count('BULLETIN_CLASSIFIED') + count('BULLETIN_BANNER')

  // A takeover consumes the whole bulletin block, so it reads as a full house.
  // Anything booked alongside it (or a second takeover) pushes past capacity.
  const bulletinSold =
    takeovers > 0 ? takeovers * bulletinCap + otherBulletin : otherBulletin

  const sections = emptySections()
  for (const booking of live) {
    if (booking.adType !== 'SECTION_SPONSOR') continue
    const key = booking.section ?? 'UNASSIGNED'
    if (!sections[key]) sections[key] = { sold: 0, cap: SECTION_CAP }
    sections[key].sold += 1
  }

  const report: CapacityReport = {
    headline: { sold: count('HEADLINE'), cap: SINGLE_SLOT_CAP },
    feature: { sold: count('FEATURE'), cap: SINGLE_SLOT_CAP },
    featuredEvent: { sold: count('FEATURED_EVENT'), cap: SINGLE_SLOT_CAP },
    bulletin: { sold: bulletinSold, cap: bulletinCap, takeover: takeovers > 0 },
    sections,
    oversold: false,
    totalSold: 0,
    totalCap: 0,
  }

  const groups = [report.headline, report.feature, report.featuredEvent, report.bulletin]
  const sectionGroups = Object.values(report.sections)

  report.oversold = [...groups, ...sectionGroups].some((g) => g.sold > g.cap)
  report.totalSold = [...groups, ...sectionGroups].reduce((sum, g) => sum + g.sold, 0)
  report.totalCap = [...groups, ...sectionGroups].reduce((sum, g) => sum + g.cap, 0)

  return report
}

/** Total sellable slots on a single issue, used for sell-through. */
export function totalCapacityPerIssue(bulletinCap: number): number {
  return (
    SINGLE_SLOT_CAP * 3 + // headline, feature, featured event
    bulletinCap +
    SECTION_SLOTS.length * SECTION_CAP
  )
}

/** Loads an issue's bookings and builds its report. */
export async function getCapacityReport(issueId: string): Promise<CapacityReport> {
  const [bookings, settings] = await Promise.all([
    prisma.booking.findMany({
      where: { issueId },
      select: { id: true, adType: true, section: true, status: true },
    }),
    getSettings(),
  ])
  return buildCapacityReport(bookings, settings.bulletinCapacity)
}

/** Batched variant — one query for many issues. */
export async function getCapacityReports(
  issueIds: string[]
): Promise<Record<string, CapacityReport>> {
  const reports: Record<string, CapacityReport> = {}
  if (issueIds.length === 0) return reports

  const [bookings, settings] = await Promise.all([
    prisma.booking.findMany({
      where: { issueId: { in: issueIds } },
      select: { id: true, issueId: true, adType: true, section: true, status: true },
    }),
    getSettings(),
  ])

  const byIssue = new Map<string, BookingLike[]>()
  for (const id of issueIds) byIssue.set(id, [])
  for (const booking of bookings) {
    byIssue.get(booking.issueId)?.push(booking)
  }

  for (const [issueId, issueBookings] of byIssue) {
    reports[issueId] = buildCapacityReport(issueBookings, settings.bulletinCapacity)
  }
  return reports
}

/**
 * Pure capacity check. `existing` should already exclude the draft's own row
 * when editing.
 */
export function checkCapacity(
  existing: BookingLike[],
  draft: DraftBooking,
  bulletinCap: number
): CapacityCheck {
  const report = buildCapacityReport(existing, bulletinCap)

  switch (draft.adType) {
    case 'HEADLINE':
    case 'FEATURE':
    case 'FEATURED_EVENT': {
      const group =
        draft.adType === 'HEADLINE'
          ? report.headline
          : draft.adType === 'FEATURE'
            ? report.feature
            : report.featuredEvent
      if (group.sold >= group.cap) {
        return {
          ok: false,
          reason: `This issue already has a ${label(draft.adType)} booking. Only ${group.cap} is available per issue — cancel or move the existing one first.`,
        }
      }
      return { ok: true }
    }

    case 'SECTION_SPONSOR': {
      if (!draft.section) {
        return { ok: false, reason: 'Pick a section for the Section Sponsor.' }
      }
      const section = report.sections[draft.section] ?? { sold: 0, cap: SECTION_CAP }
      if (section.sold >= section.cap) {
        return {
          ok: false,
          reason: `The ${label(draft.section)} section already has a sponsor on this issue. Other sections are still open.`,
        }
      }
      return { ok: true }
    }

    case 'BULLETIN_TAKEOVER': {
      if (report.bulletin.sold > 0) {
        return {
          ok: false,
          reason: `A Bulletin Takeover consumes all ${bulletinCap} bulletin slots, but this issue already has ${report.bulletin.sold} bulletin ${report.bulletin.sold === 1 ? 'booking' : 'bookings'}. Clear them first.`,
        }
      }
      return { ok: true }
    }

    case 'BULLETIN_CLASSIFIED':
    case 'BULLETIN_BANNER': {
      if (report.bulletin.takeover) {
        return {
          ok: false,
          reason: 'This issue is sold as a Bulletin Takeover, so no other bulletin ads can run alongside it.',
        }
      }
      if (report.bulletin.sold >= report.bulletin.cap) {
        return {
          ok: false,
          reason: `All ${report.bulletin.cap} bulletin slots on this issue are taken.`,
        }
      }
      return { ok: true }
    }

    default:
      return { ok: true }
  }
}

/**
 * Used by the booking server action to block over-capacity confirms.
 * RESERVED bookings are allowed through even when over capacity — they simply
 * surface an oversold warning on the issue.
 */
export async function canConfirm(
  issueId: string,
  draftBooking: DraftBooking
): Promise<CapacityCheck> {
  const [existing, settings] = await Promise.all([
    prisma.booking.findMany({
      where: { issueId, ...(draftBooking.id ? { NOT: { id: draftBooking.id } } : {}) },
      select: { id: true, adType: true, section: true, status: true },
    }),
    getSettings(),
  ])

  return checkCapacity(existing, draftBooking, settings.bulletinCapacity)
}

/** True when a booking status is one that must respect hard capacity limits. */
export function isCapacityEnforcedStatus(status: string): boolean {
  return status === 'CONFIRMED' || status === 'RAN'
}

/** Display helper: OPEN / FULL / OVERSOLD for a single group. */
export type SlotState = 'OPEN' | 'FULL' | 'OVERSOLD'

export function slotState(sold: number, cap: number): SlotState {
  if (sold > cap) return 'OVERSOLD'
  if (sold >= cap) return 'FULL'
  return 'OPEN'
}
