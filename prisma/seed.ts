import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// All sample dates use midday so they stay put regardless of the machine's
// timezone.

/**
 * The Tide publishes weekly on a Thursday. The sample issues are anchored to
 * the next three publish dates rather than fixed calendar dates, so a fresh
 * clone always opens on a populated dashboard instead of an empty "this month".
 */
function nthPublishDate(weeksAhead: number): Date {
  const day = new Date()
  day.setHours(12, 0, 0, 0)
  // 4 = Thursday. Land on today if today is already publish day.
  day.setDate(day.getDate() + ((4 - day.getDay() + 7) % 7) + weeksAhead * 7)
  return day
}

function issueTitle(publishDate: Date): string {
  const formatted = new Intl.DateTimeFormat('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(publishDate)
  return `The Tide — ${formatted}`
}

/** Days back from today, for "last contacted" timestamps. */
function daysAgo(days: number): Date {
  const day = new Date()
  day.setHours(12, 0, 0, 0)
  day.setDate(day.getDate() - days)
  return day
}

async function main() {
  // Idempotent: a re-seed replaces the sample rows rather than duplicating.
  await prisma.booking.deleteMany()
  await prisma.issue.deleteMany()
  await prisma.advertiser.deleteMany()

  const realty = await prisma.advertiser.create({
    data: {
      name: 'Example Realty Ōrewa',
      category: 'REAL_ESTATE',
      status: 'ACTIVE',
      contactName: 'Sam Whitcombe',
      email: 'sam@example-realty.co.nz',
      phone: '021 555 0142',
      website: 'https://example-realty.co.nz',
      reviewsChecked: true,
      lastContacted: daysAgo(10),
      notes: 'Books the Headline most weeks. Prefers copy locked in by Monday.',
    },
  })

  const plumbing = await prisma.advertiser.create({
    data: {
      name: 'Example Plumbing',
      category: 'TRADES',
      status: 'PROSPECT',
      contactName: 'Dana Reid',
      email: 'hello@example-plumbing.co.nz',
      phone: '09 555 0198',
      reviewsChecked: false,
      notes: 'Walk-in enquiry from the Ōrewa market. Wants to trial a classified.',
    },
  })

  const marine = await prisma.advertiser.create({
    data: {
      name: 'Example Marine',
      category: 'MARINE',
      status: 'PITCHED',
      contactName: 'Kelly Ngata',
      email: 'kelly@example-marine.co.nz',
      website: 'https://example-marine.co.nz',
      reviewsChecked: true,
      lastContacted: daysAgo(7),
      notes: 'Interested in sponsoring Weather through summer.',
    },
  })

  const week1 = nthPublishDate(0)
  const week2 = nthPublishDate(1)
  const week3 = nthPublishDate(2)

  const nextIssue = await prisma.issue.create({
    data: {
      title: issueTitle(week1),
      publishDate: week1,
      status: 'DRAFTING',
      theme: 'Delmore stage 2 consent + Ōrewa night market',
    },
  })

  const followingIssue = await prisma.issue.create({
    data: {
      title: issueTitle(week2),
      publishDate: week2,
      status: 'PLANNING',
    },
  })

  await prisma.issue.create({
    data: {
      title: issueTitle(week3),
      publishDate: week3,
      status: 'PLANNING',
    },
  })

  const shortDate = (value: Date) =>
    new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short' }).format(value)

  await prisma.booking.create({
    data: {
      label: `Example Realty Ōrewa – Headline – ${shortDate(week1)}`,
      advertiserId: realty.id,
      issueId: nextIssue.id,
      adType: 'HEADLINE',
      price: 450,
      status: 'CONFIRMED',
      paid: 'INVOICED',
      ctaUrl: 'https://example-realty.co.nz/listings',
      copy: 'Thinking of selling before spring? Example Realty Ōrewa has buyers waiting on the Hibiscus Coast. Free appraisal, no obligation.',
    },
  })

  await prisma.booking.create({
    data: {
      label: `Example Marine – Section Sponsor (Weather) – ${shortDate(week1)}`,
      advertiserId: marine.id,
      issueId: nextIssue.id,
      adType: 'SECTION_SPONSOR',
      section: 'WEATHER',
      price: 150,
      status: 'RESERVED',
      paid: 'UNPAID',
    },
  })

  await prisma.booking.create({
    data: {
      label: `Example Plumbing – Bulletin – Classified – ${shortDate(week2)}`,
      advertiserId: plumbing.id,
      issueId: followingIssue.id,
      adType: 'BULLETIN_CLASSIFIED',
      price: 80,
      status: 'RESERVED',
      paid: 'UNPAID',
      copy: 'Blocked drain? Example Plumbing covers Ōrewa to Waiwera, same-day callouts.',
    },
  })

  // Settings are left alone — getSettings() creates the single row with
  // defaults on first access, so a re-seed never clobbers edited settings.

  const [advertisers, issues, bookings] = await Promise.all([
    prisma.advertiser.count(),
    prisma.issue.count(),
    prisma.booking.count(),
  ])

  console.log(
    `Seeded ${advertisers} advertisers, ${issues} issues, ${bookings} bookings.`
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
