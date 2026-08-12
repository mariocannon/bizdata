import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { beehiivFilename, escapeHtml, toBeehiivHtml, type BeehiivListing } from './beehiiv'

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

  it('turns a ticket link into a button that says what to do with it', () => {
    const html = toBeehiivHtml([
      listing({ headline: 'Ōrewa Night Market', url: 'https://example.co.nz/tickets' }),
    ])
    assert.match(
      html,
      /<a href="https:\/\/example\.co\.nz\/tickets"[^>]*>Click here for more info<\/a>/
    )
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
    const button = html.indexOf('Click here for more info')
    const contact = html.indexOf('Jo Ngata')
    assert.ok(body < button && button < contact, 'button should follow the copy')
  })

  it('leaves the button out when there is no link', () => {
    assert.doesNotMatch(toBeehiivHtml([listing()]), /Click here/)
    assert.doesNotMatch(toBeehiivHtml([listing({ url: null })]), /Click here/)
    assert.doesNotMatch(toBeehiivHtml([listing({ url: '   ' })]), /Click here/)
  })

  it('only puts http(s) behind the button', () => {
    // eslint-disable-next-line no-script-url
    const html = toBeehiivHtml([listing({ url: 'javascript:alert(1)' })])
    assert.doesNotMatch(html, /Click here/)
    assert.doesNotMatch(html, /javascript:/)
  })

  it('escapes a link that would break out of the href', () => {
    const html = toBeehiivHtml([
      listing({ url: 'https://example.co.nz/?a=1&b=2" onclick="alert(1)' }),
    ])
    assert.match(html, /&amp;b=2&quot; onclick=&quot;/)
    assert.doesNotMatch(html, /onclick="/)
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
