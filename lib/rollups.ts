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

/** Rollup totals per advertiser, in one query. */
export async function getAdvertiserTotals(): Promise<Map<string, MoneyTotals>> {
  const bookings = await prisma.booking.findMany({
    where: { status: { not: 'CANCELLED' } },
    select: { advertiserId: true, price: true, paid: true, status: true },
  })

  const totals = new Map<string, MoneyTotals>()
  for (const booking of bookings) {
    const current = totals.get(booking.advertiserId) ?? { ...ZERO_TOTALS }
    current.bookings += 1
    current.booked += booking.price
    if (booking.paid === 'PAID') current.paid += booking.price
    else current.outstanding += booking.price
    totals.set(booking.advertiserId, current)
  }

  return totals
}

/** Rollup totals per issue, in one query. */
export async function getIssueTotals(): Promise<Map<string, MoneyTotals>> {
  const bookings = await prisma.booking.findMany({
    where: { status: { not: 'CANCELLED' } },
    select: { issueId: true, price: true, paid: true, status: true },
  })

  const totals = new Map<string, MoneyTotals>()
  for (const booking of bookings) {
    const current = totals.get(booking.issueId) ?? { ...ZERO_TOTALS }
    current.bookings += 1
    current.booked += booking.price
    if (booking.paid === 'PAID') current.paid += booking.price
    else current.outstanding += booking.price
    totals.set(booking.issueId, current)
  }

  return totals
}
