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
 * Pure rollup, grouped by whatever key you pick. Kept free of I/O so a page
 * that has already loaded its bookings can total them without a second query.
 */
export function totalsBy<T extends BookingMoney>(
  bookings: T[],
  key: (booking: T) => string
): Map<string, MoneyTotals> {
  const totals = new Map<string, MoneyTotals>()

  for (const booking of bookings) {
    if (booking.status === 'CANCELLED') continue
    const bucket = key(booking)
    const current = totals.get(bucket) ?? { ...ZERO_TOTALS }
    current.bookings += 1
    current.booked += booking.price
    if (booking.paid === 'PAID') current.paid += booking.price
    else current.outstanding += booking.price
    totals.set(bucket, current)
  }

  return totals
}

/** Rollup totals per advertiser, in one query. */
export async function getAdvertiserTotals(): Promise<Map<string, MoneyTotals>> {
  const bookings = await prisma.booking.findMany({
    where: { status: { not: 'CANCELLED' } },
    select: { advertiserId: true, price: true, paid: true, status: true },
  })

  return totalsBy(bookings, (booking) => booking.advertiserId)
}

// There is no `getIssueTotals` counterpart: the issues list needs each issue's
// capacity as well as its money, and both come off one scan of the bookings it
// already runs. It calls `totalsBy` directly.
