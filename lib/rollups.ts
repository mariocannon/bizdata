import { prisma } from '@/lib/db'

export type MoneyTotals = {
  booked: number
  paid: number
  outstanding: number
  bookings: number
}

export const ZERO_TOTALS: MoneyTotals = {
  booked: 0,
  paid: 0,
  outstanding: 0,
  bookings: 0,
}

export type BookingMoney = { price: number; paid: string; status: string }

/** Booked / collected / outstanding for a set of bookings. Cancelled excluded. */
export function sumBookings(bookings: BookingMoney[]): MoneyTotals {
  const totals = { ...ZERO_TOTALS }

  for (const booking of bookings) {
    if (booking.status === 'CANCELLED') continue
    totals.bookings += 1
    totals.booked += booking.price
    if (booking.paid === 'PAID') totals.paid += booking.price
    else totals.outstanding += booking.price
  }

  return totals
}

/**
 * Pure grouped rollup. Cancelled bookings are skipped here rather than in a
 * `where` clause, so a caller that already holds the whole booking list — the
 * issues page needs the cancelled ones for capacity — can group it without a
 * second query.
 */
export function rollupBy<T extends BookingMoney>(
  bookings: T[],
  keyOf: (booking: T) => string
): Map<string, MoneyTotals> {
  const totals = new Map<string, MoneyTotals>()

  for (const booking of bookings) {
    if (booking.status === 'CANCELLED') continue
    const key = keyOf(booking)
    const current = totals.get(key) ?? { ...ZERO_TOTALS }
    current.bookings += 1
    current.booked += booking.price
    if (booking.paid === 'PAID') current.paid += booking.price
    else current.outstanding += booking.price
    totals.set(key, current)
  }

  return totals
}

/** Rollup totals per advertiser, in one query. */
export async function getAdvertiserTotals(): Promise<Map<string, MoneyTotals>> {
  const bookings = await prisma.booking.findMany({
    where: { status: { not: 'CANCELLED' } },
    select: { advertiserId: true, price: true, paid: true, status: true },
  })

  return rollupBy(bookings, (booking) => booking.advertiserId)
}

/** Rollup totals per issue, in one query. */
export async function getIssueTotals(): Promise<Map<string, MoneyTotals>> {
  const bookings = await prisma.booking.findMany({
    where: { status: { not: 'CANCELLED' } },
    select: { issueId: true, price: true, paid: true, status: true },
  })

  return rollupBy(bookings, (booking) => booking.issueId)
}
