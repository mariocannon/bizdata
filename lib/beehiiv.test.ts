import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  beehiivFilename,
  escapeHtml,
  jobsToBeehiivListings,
  toBeehiivHtml,
  type BeehiivListing,
  type JobForBeehiiv,
} from './beehiiv'

function listing(overrides: Partial<BeehiivListing> = {}): BeehiivListing {
  return {
    headline: 'Tidy 4.2m alloy runabout',
    body: 'Well-kept boat, serviced in March.',
    category: 'For sale',
    contactName: 'Jo Ngata',
    contactEmail: 'jo@example.co.nz',
    contactPhone: '021 555 0142',
    ...overrides,
  }
}

describe('escapeHtml', () => {
  it('escapes the characters that would break the markup', () => {
    assert.equal(escapeHtml('Fish & chips'), 'Fish &amp; chips')
    assert.equal(escapeHtml('<script>x</script>'), '&lt;script&gt;x&lt;/script&gt;')
    assert.equal(escapeHtml(`He said "hi"`), 'He said &quot;hi&quot;')
    assert.equal(escapeHtml("it's"), 'it&#39;s')
  })
})

describe('toBeehiivHtml', () => {
  it('includes the headline, copy and contact details', () => {
    const html = toBeehiivHtml([listing()])
    assert.match(html, /Tidy 4\.2m alloy runabout/)
    assert.match(html, /Well-kept boat, serviced in March\./)
    assert.match(html, /Jo Ngata/)
    assert.match(html, /021 555 0142/)
  })

  it('makes the email a mailto link', () => {
    const html = toBeehiivHtml([listing()])
    assert.match(html, /<a href="mailto:jo@example\.co\.nz"/)
  })

  it('escapes copy that came in off the public form', () => {
    const html = toBeehiivHtml([
      listing({ headline: 'Fish & chips', body: '<b>cheap</b> & tasty' }),
    ])
    assert.match(html, /Fish &amp; chips/)
    assert.match(html, /&lt;b&gt;cheap&lt;\/b&gt; &amp; tasty/)
    // The submitted markup must not survive as markup.
    assert.doesNotMatch(html, /<b>cheap<\/b>/)
  })

  it('keeps the line breaks a submitter typed', () => {
    const html = toBeehiivHtml([listing({ body: 'First line\nSecond line' })])
    assert.match(html, /First line<br \/>Second line/)
  })

  it('leaves out contact parts that are missing', () => {
    const html = toBeehiivHtml([
      listing({ contactName: null, contactEmail: null, contactPhone: '021 555 0142' }),
    ])
    assert.match(html, /021 555 0142/)
    assert.doesNotMatch(html, /&middot;/)
  })

  it('omits the contact line entirely when there is nothing to show', () => {
    const html = toBeehiivHtml([
      listing({ contactName: null, contactEmail: null, contactPhone: null }),
    ])
    assert.doesNotMatch(html, /mailto/)
  })

  it('groups by category when there is more than one', () => {
    const html = toBeehiivHtml([
      listing({ category: 'For sale' }),
      listing({ category: 'Wanted', headline: 'Garage wanted' }),
    ])
    assert.match(html, /For sale/)
    assert.match(html, /Wanted/)
  })

  it('skips category headings when everything is one category', () => {
    const html = toBeehiivHtml([listing(), listing({ headline: 'Another boat' })])
    // The only "For sale" would be a heading, and it earns nothing here.
    assert.equal(html.match(/For sale/g), null)
  })

  it('uses the title and subtitle it is given', () => {
    const html = toBeehiivHtml([listing()], {
      title: 'Community classifieds',
      subtitle: 'The Tide — 6 Aug 2026',
    })
    assert.match(html, /Community classifieds/)
    assert.match(html, /The Tide — 6 Aug 2026/)
  })

  it('styles inline, never in a style block', () => {
    const html = toBeehiivHtml([listing()])
    assert.match(html, /style="font-size:17px;font-weight:700/)
    assert.doesNotMatch(html, /<style/)
  })

  it('never closes a style attribute early', () => {
    // A double quote inside the font stack would end the attribute there and
    // drop the rest of the declarations — which renders as Times, silently.
    const html = toBeehiivHtml([listing()])
    assert.match(html, /style="font-family:[^"]*sans-serif;[^"]*"/)
  })

  it('handles an empty list without producing broken markup', () => {
    const html = toBeehiivHtml([])
    assert.match(html, /Classifieds/)
    // The accent rule under the title, and no listing dividers after it.
    assert.equal(html.match(/<hr/g)?.length, 1)
  })
})

describe('event listings', () => {
  it('puts the when-and-where line between the title and the copy', () => {
    const html = toBeehiivHtml([
      listing({ headline: 'Ōrewa Night Market', meta: 'Sat 15 Aug 2026, 5pm · The Esplanade' }),
    ])
    const title = html.indexOf('Ōrewa Night Market')
    const meta = html.indexOf('Sat 15 Aug 2026, 5pm · The Esplanade')
    const body = html.indexOf('Well-kept boat')
    assert.ok(title < meta && meta < body, 'meta should sit between title and copy')
  })

  it('escapes the meta line like everything else', () => {
    const html = toBeehiivHtml([listing({ meta: 'Sat 15 Aug · Bob & Sons <hall>' })])
    assert.match(html, /Bob &amp; Sons &lt;hall&gt;/)
  })

  it('leaves the meta line out when there is none', () => {
    const html = toBeehiivHtml([listing()])
    assert.doesNotMatch(html, /font-size:14px;font-weight:600/)
  })

  it('turns a ticket link into a More info button', () => {
    const html = toBeehiivHtml([
      listing({ headline: 'Ōrewa Night Market', url: 'https://example.co.nz/tickets' }),
    ])
    assert.match(html, /<a href="https:\/\/example\.co\.nz\/tickets"[^>]*>More info<\/a>/)
  })

  it('styles the button as the brand guide styles a primary one', () => {
    const html = toBeehiivHtml([listing({ url: 'https://example.co.nz/tickets' })])
    assert.match(html, /background:#a2c5d3/) // Sea Glass fill
    assert.match(html, /color:#23313c/) // Deep Harbor label
    assert.match(html, /display:inline-block/) // or the padding and fill collapse
    assert.match(html, /text-decoration:none/)
  })

  it('sits the button between the copy and the contact line', () => {
    const html = toBeehiivHtml([listing({ url: 'https://example.co.nz/tickets' })])
    const body = html.indexOf('Well-kept boat')
    const button = html.indexOf('More info')
    const contact = html.indexOf('Jo Ngata')
    assert.ok(body < button && button < contact, 'button should follow the copy')
  })

  it('leaves the button out when there is no link', () => {
    assert.doesNotMatch(toBeehiivHtml([listing()]), /More info/)
    assert.doesNotMatch(toBeehiivHtml([listing({ url: null })]), /More info/)
    assert.doesNotMatch(toBeehiivHtml([listing({ url: '   ' })]), /More info/)
  })

  it('only puts http(s) behind the button', () => {
    // eslint-disable-next-line no-script-url
    const html = toBeehiivHtml([listing({ url: 'javascript:alert(1)' })])
    assert.doesNotMatch(html, /More info/)
    assert.doesNotMatch(html, /javascript:/)
  })

  it('escapes a link that would break out of the href', () => {
    const html = toBeehiivHtml([
      listing({ url: 'https://example.co.nz/?a=1&b=2" onclick="alert(1)' }),
    ])
    assert.match(html, /&amp;b=2&quot; onclick=&quot;/)
    assert.doesNotMatch(html, /onclick="/)
  })

  it('prints a featured image between the meta line and the copy', () => {
    const html = toBeehiivHtml([
      listing({
        meta: 'Sat 15 Aug 2026, 10am',
        imageUrl: 'https://cdn.example.co.nz/night-market.jpg',
      }),
    ])
    assert.match(html, /<img src="https:\/\/cdn\.example\.co\.nz\/night-market\.jpg"/)
    assert.ok(
      html.indexOf('Sat 15 Aug 2026') < html.indexOf('<img') &&
        html.indexOf('<img') < html.indexOf('Well-kept boat')
    )
  })

  it('captions the image with the headline, escaped', () => {
    const html = toBeehiivHtml([
      listing({
        headline: 'Fish & chips "night"',
        imageUrl: 'https://cdn.example.co.nz/a.png',
      }),
    ])
    assert.match(html, /alt="Fish &amp; chips &quot;night&quot;"/)
  })

  it('leaves the image out when there is none', () => {
    assert.doesNotMatch(toBeehiivHtml([listing()]), /<img/)
    assert.doesNotMatch(toBeehiivHtml([listing({ imageUrl: null })]), /<img/)
  })

  it('skips an image that is not a public http(s) URL', () => {
    // The local-disk driver returns a path, which means nothing in an inbox.
    assert.doesNotMatch(toBeehiivHtml([listing({ imageUrl: '/uploads/a.png' })]), /<img/)
    assert.doesNotMatch(
      toBeehiivHtml([listing({ imageUrl: 'data:image/png;base64,AAAA' })]),
      /<img/
    )
  })

  it('escapes an image URL that would break out of the attribute', () => {
    const html = toBeehiivHtml([
      listing({ imageUrl: 'https://example.co.nz/a.png" onerror="alert(1)' }),
    ])
    assert.match(html, /&quot; onerror=&quot;/)
    assert.doesNotMatch(html, /onerror="/)
  })

  it('leads with the featured listing, wherever it falls in date order', () => {
    const html = toBeehiivHtml(
      [
        listing({ headline: 'First up' }),
        listing({ headline: 'Then this' }),
        listing({ headline: 'Paid to lead', featured: true }),
      ],
      { groupByCategory: false }
    )

    assert.ok(html.indexOf('Paid to lead') < html.indexOf('First up'))
    // The rest keeps the diary order it arrived in.
    assert.ok(html.indexOf('First up') < html.indexOf('Then this'))
  })

  it('keeps featured listings in the order they arrived in', () => {
    const html = toBeehiivHtml(
      [
        listing({ headline: 'Plain one' }),
        listing({ headline: 'Featured in August', featured: true }),
        listing({ headline: 'Featured in September', featured: true }),
      ],
      { groupByCategory: false }
    )

    assert.ok(
      html.indexOf('Featured in August') < html.indexOf('Featured in September') &&
        html.indexOf('Featured in September') < html.indexOf('Plain one')
    )
  })

  it('leaves the order alone when nothing is featured', () => {
    const html = toBeehiivHtml(
      [
        listing({ headline: 'First up' }),
        listing({ headline: 'Then this', featured: false }),
        listing({ headline: 'Last', featured: null }),
      ],
      { groupByCategory: false }
    )

    assert.ok(
      html.indexOf('First up') < html.indexOf('Then this') &&
        html.indexOf('Then this') < html.indexOf('Last')
    )
  })

  it('leads a grouped block with the featured listing, inside its own category', () => {
    const html = toBeehiivHtml([
      listing({ headline: 'Plain for sale', category: 'For sale' }),
      listing({ headline: 'Plain wanted', category: 'Wanted' }),
      listing({ headline: 'Paid to lead', category: 'Wanted', featured: true }),
    ])

    // The featured listing leads the block, and its category comes with it —
    // a listing is never printed away from the heading it belongs under.
    assert.ok(html.indexOf('Wanted') < html.indexOf('For sale'))
    assert.ok(html.indexOf('Paid to lead') < html.indexOf('Plain wanted'))
    assert.ok(html.indexOf('Plain wanted') < html.indexOf('Plain for sale'))
  })

  it('keeps each category in the order it was handed over', () => {
    const html = toBeehiivHtml([
      listing({ headline: 'Market in August', category: 'Markets' }),
      listing({ headline: 'Gig in August', category: 'Music' }),
      listing({ headline: 'Market in September', category: 'Markets' }),
      listing({ headline: 'Gig in September', category: 'Music' }),
    ])

    // Each heading collects its own listings, and inside a category the diary
    // order the caller sorted into survives the grouping.
    assert.ok(html.indexOf('Market in August') < html.indexOf('Market in September'))
    assert.ok(html.indexOf('Market in September') < html.indexOf('Gig in August'))
    assert.ok(html.indexOf('Gig in August') < html.indexOf('Gig in September'))
  })

  it('gives each category its own panel, with a gap between them', () => {
    const html = toBeehiivHtml([
      listing({ category: 'Markets' }),
      listing({ headline: 'Gig', category: 'Music' }),
    ])

    // A padded Foam panel per category...
    assert.equal(html.match(/background:#faf5ea/g)?.length, 2)
    // ...and one gap: between the two, not under the last.
    assert.equal(html.match(/padding:0 0 20px;/g)?.length, 1)
    // One rule under the title, and none between the categories — two
    // single-listing categories mean no in-category dividers either.
    assert.equal(html.match(/<hr/g)?.length, 1)
  })

  it('leaves the panel off a block that has no categories to separate', () => {
    // One category, and grouping off entirely: neither is a set of sections.
    assert.doesNotMatch(toBeehiivHtml([listing(), listing()]), /background:#faf5ea/)
    assert.doesNotMatch(
      toBeehiivHtml([listing(), listing({ category: 'Wanted' })], { groupByCategory: false }),
      /background:#faf5ea/
    )
  })

  it('keeps date order instead of grouping when grouping is off', () => {
    const html = toBeehiivHtml(
      [
        listing({ headline: 'First up', category: 'Music' }),
        listing({ headline: 'Then this', category: 'Market' }),
        listing({ headline: 'Last', category: 'Music' }),
      ],
      { groupByCategory: false }
    )
    // No category headings, and the order given is the order rendered.
    assert.doesNotMatch(html, /text-transform:uppercase/)
    assert.ok(
      html.indexOf('First up') < html.indexOf('Then this') &&
        html.indexOf('Then this') < html.indexOf('Last')
    )
  })
})

describe('job listings', () => {
  function job(overrides: Partial<JobForBeehiiv> = {}): JobForBeehiiv {
    return {
      title: 'Weekend barista',
      body: 'Saturday and Sunday mornings, 6am–noon. Experience on a two-group machine preferred.',
      category: 'Hospitality',
      employer: 'Coastline Coffee',
      town: 'Orewa',
      jobType: 'CASUAL',
      pay: '$24–$27/hr',
      applyUrl: null,
      logoUrl: null,
      tier: 'STANDARD',
      closesAt: new Date('2026-12-20T00:00:00+13:00'),
      contactName: 'Jo Ngata',
      contactEmail: 'jobs@example.co.nz',
      contactPhone: null,
      ...overrides,
    }
  }

  it('builds the meta line from employer, town, type and pay', () => {
    const html = toBeehiivHtml(jobsToBeehiivListings([job()]), { title: 'Jobs' })
    // Ōrewa is macronised on the way out; CASUAL becomes "Casual".
    assert.match(html, /Coastline Coffee · Ōrewa · Casual · \$24–\$27\/hr/)
    const title = html.indexOf('Weekend barista')
    const meta = html.indexOf('Coastline Coffee · Ōrewa')
    const body = html.indexOf('Saturday and Sunday')
    assert.ok(title < meta && meta < body, 'meta should sit between the title and the copy')
  })

  it('drops the pay segment when none was given', () => {
    const html = toBeehiivHtml(jobsToBeehiivListings([job({ pay: null })]), { title: 'Jobs' })
    assert.match(html, /Coastline Coffee · Ōrewa · Casual</)
    assert.doesNotMatch(html, /\$24/)
  })

  it('orders by closing date, soonest first', () => {
    const html = toBeehiivHtml(
      jobsToBeehiivListings([
        job({ title: 'Closes later', closesAt: new Date('2027-01-15T00:00:00+13:00') }),
        job({ title: 'Closes sooner', closesAt: new Date('2026-12-10T00:00:00+13:00') }),
      ]),
      { title: 'Jobs' }
    )
    assert.ok(html.indexOf('Closes sooner') < html.indexOf('Closes later'))
  })

  it('leads with the featured listing, wherever it falls in the date order', () => {
    const html = toBeehiivHtml(
      jobsToBeehiivListings([
        job({ title: 'Plain, closes first', closesAt: new Date('2026-12-05T00:00:00+13:00') }),
        job({
          title: 'Featured, closes last',
          tier: 'FEATURED',
          logoUrl: 'https://cdn.example.co.nz/logo.png',
          closesAt: new Date('2027-02-01T00:00:00+13:00'),
        }),
      ]),
      { title: 'Jobs' }
    )
    assert.ok(html.indexOf('Featured, closes last') < html.indexOf('Plain, closes first'))
  })

  it('carries the employer logo only for a featured listing', () => {
    const featured = toBeehiivHtml(
      jobsToBeehiivListings([
        job({ tier: 'FEATURED', logoUrl: 'https://cdn.example.co.nz/logo.png' }),
      ]),
      { title: 'Jobs' }
    )
    assert.match(featured, /<img src="https:\/\/cdn\.example\.co\.nz\/logo\.png"/)

    const standard = toBeehiivHtml(
      jobsToBeehiivListings([job({ logoUrl: 'https://cdn.example.co.nz/logo.png' })]),
      { title: 'Jobs' }
    )
    assert.doesNotMatch(standard, /<img/)
  })

  it('turns an apply link into a More info button', () => {
    const html = toBeehiivHtml(
      jobsToBeehiivListings([job({ applyUrl: 'https://example.co.nz/careers' })]),
      { title: 'Jobs' }
    )
    assert.match(html, /<a href="https:\/\/example\.co\.nz\/careers"[^>]*>More info<\/a>/)
  })

  it('escapes copy that came in off the public form', () => {
    const html = toBeehiivHtml(
      jobsToBeehiivListings([job({ title: 'Barista & host', body: '<b>great</b> team' })]),
      { title: 'Jobs' }
    )
    assert.match(html, /Barista &amp; host/)
    assert.doesNotMatch(html, /<b>great<\/b>/)
  })
})

describe('The Tide branding', () => {
  it('boxes the block at 600px', () => {
    const html = toBeehiivHtml([listing()])
    assert.match(html, /max-width:600px/)
    assert.match(html, /margin:0 auto/)
    // Without border-box the padding sits outside the cap and it renders wider.
    assert.match(html, /box-sizing:border-box/)
  })

  it('draws a border around it', () => {
    const html = toBeehiivHtml([listing()])
    assert.match(html, /border:1px solid rgba\(35, 65, 90, 0\.25\)/)
  })

  it('uses the brand palette, not defaults', () => {
    const html = toBeehiivHtml([listing({ category: 'For sale' }), listing({ category: 'Wanted' })])
    assert.match(html, /#fffdf8/) // Paper surface
    assert.match(html, /#23313c/) // Deep Harbor text
    assert.match(html, /#5a6672/) // Slate secondary
    assert.match(html, /#45758c/) // Steel Blue eyebrow + links
    assert.match(html, /#a2c5d3/) // Sea Glass accent rule
  })

  it('sets category eyebrows the way the guide does', () => {
    const html = toBeehiivHtml([listing({ category: 'For sale' }), listing({ category: 'Wanted' })])
    assert.match(html, /font-weight:700;letter-spacing:0\.18em;text-transform:uppercase/)
  })

  it('sizes the page to the block, with no dead space around it', () => {
    const html = toBeehiivHtml([listing()])
    assert.match(html, /<body style="margin:0;padding:0;width:fit-content;"/)
    // No decorative page wash — it only reads as blank space around the card.
    assert.doesNotMatch(html, /radial-gradient/)
  })

  it('ships the system stack and no web fonts', () => {
    const html = toBeehiivHtml([listing()])
    assert.match(html, /font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif/)
    assert.doesNotMatch(html, /@font-face|fonts\.googleapis/)
  })
})

describe('beehiivFilename', () => {
  it('stamps the date and the html extension', () => {
    assert.equal(
      beehiivFilename('the-tide-classifieds', new Date('2026-08-05T09:00:00Z')),
      'the-tide-classifieds-2026-08-05.html'
    )
  })
})
