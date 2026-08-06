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
  await prisma.event.deleteMany()
  await prisma.classified.deleteMany()
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

  // Classifieds: two approved and placed into issues, one short draft still in
  // the queue, so a fresh clone shows both states.
  await prisma.classified.create({
    data: {
      headline: 'Tidy 4.2m alloy runabout, Ōrewa',
      body: 'Well-kept 4.2 metre alloy runabout with a 40hp four-stroke, serviced in March and running beautifully. Comes on a galvanised trailer with new bearings, a fish finder, safety gear for four, and a full cover. Launched off Ōrewa most weekends and never left on a mooring. Selling because the family has outgrown it. Open to a sensible offer, viewing any weekend.',
      category: 'FOR_SALE',
      status: 'APPROVED',
      contactName: 'Jo Ngata',
      contactPhone: '021 555 0142',
      issueId: nextIssue.id,
    },
  })

  await prisma.classified.create({
    data: {
      headline: 'Piano lessons in Silverdale, beginners welcome',
      body: 'Patient, experienced teacher taking a few new students this term, from complete beginners through to grade five. Lessons run half an hour after school or during the day, in a home studio five minutes from Silverdale shops with off-street parking. Exams are optional and nobody is pushed towards them. First lesson is free so you can see whether it suits. Weekday spaces left.',
      category: 'SERVICES',
      status: 'APPROVED',
      contactName: 'Marama Hughes',
      contactEmail: 'marama@example.co.nz',
      contactPhone: '022 555 0198',
      issueId: followingIssue.id,
    },
  })

  await prisma.classified.create({
    data: {
      headline: 'Wanted: dry garage space to rent',
      body: 'After a single garage or similar dry space to store a classic car over winter. Happy to pay monthly, anywhere between Silverdale and Waiwera.',
      category: 'WANTED',
      status: 'DRAFT',
      contactName: 'Peter Vaile',
      contactEmail: 'peter@example.co.nz',
      notes: 'Chasing them for a suburb before this goes in.',
    },
  })

  // Events: one with a time, one all-day, one that runs across a weekend, and
  // one already past — enough to show the date formats and the Upcoming filter.
  const eventDay = (weeksAhead: number, hours = 0, minutes = 0) => {
    const day = nthPublishDate(weeksAhead)
    day.setHours(hours, minutes, 0, 0)
    return day
  }

  await prisma.event.create({
    data: {
      title: 'Ōrewa Night Market',
      body: 'Forty stalls along the Ōrewa waterfront: hot food, local makers, and live music from seven. Free entry, dogs on leads welcome, and the carpark fills fast so walk down if you can. Runs rain or shine under cover at the surf club end.',
      startsAt: eventDay(1, 17, 0),
      endsAt: eventDay(1, 21, 0),
      location: 'The Esplanade, Ōrewa',
      category: 'MARKET',
      status: 'PUBLISHED',
      contactName: 'Hine Walters',
      contactEmail: 'hine@example.co.nz',
      issueId: nextIssue.id,
    },
  })

  await prisma.event.create({
    data: {
      title: 'Hibiscus Coast Half Marathon',
      body: 'Half, ten kilometre and five kilometre courses along the coast, starting and finishing at Victor Eaves Park. Entries close the Wednesday before. Marshals still needed — get in touch if you can spare a morning.',
      // No time: an all-day listing, which reads as a date rather than 12am.
      startsAt: eventDay(2),
      location: 'Victor Eaves Park, Ōrewa',
      category: 'SPORT',
      status: 'PUBLISHED',
      contactEmail: 'run@example.co.nz',
      ticketUrl: 'https://example.co.nz/half-marathon',
      issueId: followingIssue.id,
    },
  })

  await prisma.event.create({
    data: {
      title: 'Coast Art Trail',
      body: 'Twenty-two studios open across the weekend, from Silverdale through to Waiwera. Pick up a printed map at the library or follow the signs.',
      startsAt: eventDay(2, 10, 0),
      endsAt: eventDay(3, 16, 0),
      location: 'Studios across the Hibiscus Coast',
      category: 'ARTS',
      status: 'APPROVED',
      contactName: 'Tama Reid',
      contactPhone: '021 555 0177',
    },
  })

  await prisma.event.create({
    data: {
      title: 'Silverdale School Gala',
      body: 'The annual gala: rides, a sausage sizzle, the white elephant stall and the cake competition. All proceeds go to the new playground.',
      startsAt: eventDay(-2, 10, 0),
      endsAt: eventDay(-2, 14, 0),
      location: 'Silverdale School',
      category: 'FUNDRAISER',
      status: 'PUBLISHED',
      contactName: 'Gala committee',
      contactEmail: 'gala@example.co.nz',
    },
  })

  // Settings are left alone — getSettings() creates the single row with
  // defaults on first access, so a re-seed never clobbers edited settings.

  const [advertisers, issues, bookings, classifieds, events] = await Promise.all([
    prisma.advertiser.count(),
    prisma.issue.count(),
    prisma.booking.count(),
    prisma.classified.count(),
    prisma.event.count(),
  ])

  console.log(
    `Seeded ${advertisers} advertisers, ${issues} issues, ${bookings} bookings, ` +
      `${classifieds} classifieds, ${events} events.`
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
