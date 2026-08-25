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
  await prisma.directoryListing.deleteMany()

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

  // Business directory: the hand-curated listings that used to live in
  // thetidelanding's static category files, carried over so nothing written
  // there is lost now that the listings (not the categories) live here.
  // All start unfeatured — the operator picks one per category from /directory
  // once there is one worth leading with, rather than the seed guessing.
  await prisma.directoryListing.createMany({
    data: [
      // Cafés & coffee
      {
        name: 'Cafe Hibiscus',
        category: 'cafes',
        town: 'Stanmore Bay',
        blurb:
          'A house roaster on Whangaparāoa Road, open from half six in the morning until four — early enough for the people who are actually up then. Generous breakfasts, quick service, outdoor seating.',
      },
      {
        name: 'Beans N Bites',
        category: 'cafes',
        town: 'Stanmore Bay',
        blurb:
          'All-day brunch, which is the useful kind — no cut-off at eleven for anybody who got the morning wrong. Table service inside and out.',
      },
      {
        name: 'At 719 Coffee and Eatery',
        category: 'cafes',
        town: 'Whangaparāoa',
        blurb:
          'Organic and locally sourced where they can get it, with baking done in-house. Weekdays and weekends both from eight until half two, so it is a morning place rather than a late-lunch one.',
      },
      {
        name: 'Local Cafe',
        category: 'cafes',
        town: 'Manly',
        blurb:
          'Tiny, on Rawhiti Road, and reckoned by a lot of people to be the best on the Coast. Everything is prepared on site with local produce, and the coffee has its own following. Weekdays only, seven until four.',
      },
      {
        name: 'Spinnakers Cafe & Bar',
        category: 'cafes',
        town: 'Gulf Harbour',
        blurb:
          'Inside the marina, looking out at the boats — licensed, so it works for a coffee after a haul-out or a beer after a day on the water. The obvious meeting point if you are down that end of the peninsula.',
      },

      // Plumbers
      {
        name: 'Grouse Plumbing',
        category: 'plumbers',
        town: 'Whangaparāoa',
        url: 'https://grouseplumbing.co.nz/',
        phone: '021 0663 802',
        blurb:
          'Residential and light commercial work the length of the peninsula — kitchens, bathrooms, hot water cylinders, spouting — with 24/7 call-outs for the things that will not wait. Master Plumbers and Site Safe members, which matters as much on a renovation as on an emergency.',
      },
      {
        name: 'Laser Plumbing Silverdale',
        category: 'plumbers',
        town: 'Silverdale',
        url: 'https://silverdale.laserplumbing.co.nz/',
        blurb:
          'On the Coast since 2009, covering plumbing, gasfitting and drainage from Silverdale out to Gulf Harbour. The Laser network behind them means a written quote and a guarantee on the work, which is the trade-off for not being the cheapest number you will get.',
      },
      {
        name: 'Flowpro Plumbers & Gasfitters',
        category: 'plumbers',
        town: 'Silverdale',
        url: 'https://flowpro.co.nz/location/plumbers-hibiscus-coast-nz/',
        blurb:
          'Certified plumbers and gasfitters working out of Emirali Road, close enough to most of the Coast to make a same-day call realistic. General maintenance and gas work alike.',
      },
      {
        name: 'FlowFix Plumbing',
        category: 'plumbers',
        town: 'Hatfields Beach',
        url: 'https://www.flowfix.co.nz/',
        phone: '027 265 4949',
        blurb:
          'A family-run outfit going since 2017, covering the Albany-to-Warkworth run. Bathroom and kitchen renovations, hot water cylinders, CCTV drain inspections, and the Dux Quest pipe replacement a lot of older Coast houses still need. Free quotes on the bigger jobs.',
      },
      {
        name: 'Millwater Plumbing',
        category: 'plumbers',
        town: 'Millwater',
        url: 'https://www.millwaterplumbing.co.nz/',
        phone: '021 750 686',
        blurb:
          'Certified plumber and licensed gasfitter working out of Millwater, minutes from Silverdale and the newer subdivisions — handy if you are in Milldale or Arra Hills and want someone who knows how those houses are put together. Eleven years on the Coast.',
      },
      {
        name: 'Orewa Plumber',
        category: 'plumbers',
        town: 'Orewa',
        url: 'https://orewaplumber.co.nz/',
        phone: '027 248 4935',
        blurb:
          'Fifteen years working Orewa and the surrounding beaches, from Orewa Point and Red Beach through to Gulf Harbour and Milldale. Homes and businesses both, with 24/7 availability.',
      },

      // Electricians
      {
        name: 'Laser Electrical Silverdale',
        category: 'electricians',
        town: 'Silverdale',
        url: 'https://www.lasergroup.co.nz/m/laser-electrical-silverdale',
        phone: '09 426 3852',
        blurb:
          'On Peters Way since 1986, back when it was Fairgray Electrical — fourteen staff including ten qualified sparkies and apprentices, which is enough depth to take a new build or a shop fitout as well as a dead socket. Registered Master Electricians, with EV chargers, solar and heat pumps alongside the everyday work.',
      },
      {
        name: 'PERL Electrical',
        category: 'electricians',
        town: 'Silverdale',
        url: 'https://perlelectrical.co.nz/hibiscus/electrical-services/',
        phone: '021 298 1756',
        blurb:
          'Residential work out of Galbraith Greens, covering Silverdale to Puhoi and Whangaparāoa to Wainui — which is most of the Coast and a fair way past it. Handy if you are in one of the smaller bays that other firms treat as a detour.',
      },
      {
        name: 'AJ Electrical Services',
        category: 'electricians',
        town: 'Red Beach',
        url: 'https://www.ajelectricalservices.co.nz/',
        phone: '09 390 9884',
        blurb:
          'A family-run team of Registered Master Electricians doing both sides of the work — rewires, switchboards, kitchen and bathroom upgrades at home, and three-phase, test-and-tag and emergency lighting for businesses. Useful to know if you run something as well as live here.',
      },
      {
        name: 'Lavelle Electrical & Heating',
        category: 'electricians',
        town: 'Red Beach',
        url: 'https://www.lavelle.co.nz/page/electrical-work/',
        phone: '021 349 449',
        blurb:
          'James Lavelle, registered, working Red Beach through to Whangaparāoa. Underfloor heating is the speciality alongside the usual lighting, cylinders and renovation wiring — and the hourly rate is published on the website, which is rarer than it should be.',
      },
      {
        name: "Frosty's Electrical",
        category: 'electricians',
        town: 'Red Beach',
        url: 'https://www.frostyselectrical.co.nz/',
        blurb:
          'Residential work across Red Beach, Orewa, Silverdale, Stanmore Bay and Whangaparāoa. The sort of outfit worth having the number for before the job is urgent.',
      },

      // Mechanics & auto repair
      {
        name: 'Orewa Car Services',
        category: 'mechanics',
        town: 'Orewa',
        url: 'https://orewacarservices.co.nz/',
        blurb:
          'Family-owned since 1977, which on a peninsula this size means they have probably worked on the car before you owned it. General repair and servicing, covering Orewa out to Millwater, Silverdale, Waiwera and Whangaparāoa.',
      },
      {
        name: 'Silverdale Car Services',
        category: 'mechanics',
        town: 'Silverdale',
        url: 'https://www.silverdalecarservices.co.nz/',
        blurb:
          'European cars are the specialty — Andrew has been working on them for more than thirty-five years — but the shop covers WOFs, servicing, brakes, diagnostics, air conditioning, batteries, tyres and wheel alignments for everything else. The place to take a car that a general workshop has already had a look at.',
      },
      {
        name: 'Auto Super Shoppe Silverdale',
        category: 'mechanics',
        town: 'Silverdale',
        url: 'https://www.autosupershoppes.co.nz/mechanic/silverdale',
        blurb:
          'Ryan and Kellie Tremayne have been on the Coast thirty years and own the workshop, so the person quoting the job is the person who lives with the result. WOF inspections come as part of a routine service rather than as a separate trip.',
      },
      {
        name: 'Pit Stop Silverdale',
        category: 'mechanics',
        town: 'Silverdale',
        url: 'https://www.pitstop.co.nz/branch/silverdale',
        blurb:
          'WOFs, servicing and repairs with the backing of a national chain — bookable online, and with finance options if a repair lands at the wrong end of the month. Covers Silverdale, Orewa, Red Beach and Whangaparāoa.',
      },
      {
        name: 'Coast Mechanical',
        category: 'mechanics',
        town: 'Whangaparāoa',
        url: 'https://www.coastmechanical.co.nz/',
        blurb:
          'Mobile, so the work happens in your driveway. Derek has twenty years in the trade and takes heavy diesel as well as cars, plus tractor and boat-trailer repairs — a combination that makes more sense here than most places.',
      },
    ],
  })

  // Settings are left alone — getSettings() creates the single row with
  // defaults on first access, so a re-seed never clobbers edited settings.

  const [advertisers, issues, bookings, classifieds, events, directoryListings] =
    await Promise.all([
      prisma.advertiser.count(),
      prisma.issue.count(),
      prisma.booking.count(),
      prisma.classified.count(),
      prisma.event.count(),
      prisma.directoryListing.count(),
    ])

  console.log(
    `Seeded ${advertisers} advertisers, ${issues} issues, ${bookings} bookings, ` +
      `${classifieds} classifieds, ${events} events, ${directoryListings} directory listings.`
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
