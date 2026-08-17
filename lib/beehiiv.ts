/**
 * Renders published listings — classifieds or events — as a block of HTML to
 * drop into a beehiiv post.
 *
 * beehiiv has no listings importer, so the file is built to suit the two
 * ways anything gets into a post: open it in a browser and copy the rendered
 * page (beehiiv keeps the headings, bold and links on paste), or paste the
 * markup itself into a custom HTML block. Styles are therefore inline — email
 * builders drop `<style>` blocks — and the markup stays to tags every editor
 * understands: headings, paragraphs, links, rules.
 *
 * The file holds the block and nothing else, so "select all, copy" is exactly
 * the block. The how-to lives in an HTML comment, which renders
 * nowhere and is harmless if it gets pasted along with the markup.
 */

export type BeehiivListing = {
  headline: string
  body: string
  /** Display label, e.g. "For sale". */
  category: string
  /**
   * A line under the headline: for an event, when and where. Classifieds leave
   * it out.
   */
  meta?: string | null
  /**
   * Tickets or more info. Events only — classifieds have no link field. When
   * there is one it becomes a "More info" button under the copy.
   */
  url?: string | null
  /**
   * A featured event's image, printed above the copy. Only an absolute http(s)
   * URL travels — a local `/uploads` path means nothing in someone's inbox, so
   * one is skipped rather than printed as a broken image.
   */
  imageUrl?: string | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
}

/**
 * The Tide's palette, straight off the brand guide — see docs/BRANDING.md §1.
 * Named here so the styles below read as the guide reads. Inlined as hex
 * because email clients have no custom properties; keep it in step with the
 * tokens in app/globals.css.
 */
const BRAND = {
  foam: '#faf5ea',
  sand: '#f0e7d6',
  paper: '#fffdf8',
  deepHarbor: '#23313c',
  slate: '#5a6672',
  driftwood: '#8a8272',
  seaGlass: '#a2c5d3',
  steelBlue: '#45758c',
  /** Deep Navy at the alpha the guide uses for outlines and rules. */
  border: 'rgba(35, 65, 90, 0.25)',
  rule: 'rgba(35, 65, 90, 0.14)',
}

// System stack, no web fonts — the guide is explicit about it, and it happens to
// be the only thing that works reliably in an inbox anyway.
//
// Single quotes inside the stack on purpose: these strings land inside a
// double-quoted style attribute, and a double quote here would close it early
// and silently drop every declaration after it.
const FONT_STACK = "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif"

const STYLES = {
  wrapper: [
    `font-family:${FONT_STACK}`,
    'font-size:16px',
    'line-height:1.6',
    `color:${BRAND.deepHarbor}`,
    // Capped at 600px — beehiiv's content column — and boxed. border-box so
    // the cap is the outside edge; without it the padding and border sit
    // outside the 600 and the block measures 658.
    'box-sizing:border-box',
    'max-width:600px',
    'margin:0 auto',
    'padding:28px',
    `background:${BRAND.paper}`,
    `border:1px solid ${BRAND.border}`,
    'border-radius:10px',
  ].join(';') + ';',
  // Display: 800 with the guide's negative tracking.
  sectionTitle: `font-size:24px;font-weight:800;letter-spacing:-0.02em;color:${BRAND.deepHarbor};margin:0 0 4px;`,
  intro: `font-size:14px;color:${BRAND.slate};margin:0 0 16px;`,
  // The Sea Glass accent, used once, under the title.
  titleRule: `border:0;border-top:2px solid ${BRAND.seaGlass};margin:0 0 20px;`,
  // Eyebrow: 700, uppercase, 0.18em tracking, Steel Blue.
  categoryTitle: `font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${BRAND.steelBlue};margin:24px 0 12px;`,
  headline: `font-size:17px;font-weight:700;color:${BRAND.deepHarbor};margin:0 0 4px;`,
  // When and where, sitting between the title and the copy.
  meta: `font-size:14px;font-weight:600;color:${BRAND.steelBlue};margin:0 0 6px;`,
  body: `margin:0 0 8px;color:${BRAND.deepHarbor};`,
  /**
   * The primary button off the guide — Sea Glass fill, Deep Harbor label, the
   * 0.65rem radius as the 10px the wrapper already uses. No hover: there is no
   * hover in an inbox, and the guide says the button never changes colour
   * anyway. `inline-block` so the padding and the fill actually take.
   */
  button: [
    'display:inline-block',
    `background:${BRAND.seaGlass}`,
    `color:${BRAND.deepHarbor}`,
    'font-size:14px',
    'font-weight:700',
    'text-decoration:none',
    'padding:9px 18px',
    'border-radius:10px',
  ].join(';') + ';',
  buttonWrap: 'margin:0 0 10px;',
  /**
   * A featured event's image. Capped at the wrapper's inner width — 600 less
   * its 28px padding either side — and `height:auto` so it scales rather than
   * being letterboxed. `display:block` kills the descender gap inline images
   * leave under themselves in most clients.
   */
  image: 'display:block;width:100%;max-width:544px;height:auto;border-radius:10px;margin:0 0 10px;',
  contact: `font-size:14px;color:${BRAND.slate};margin:0;`,
  link: `color:${BRAND.steelBlue};`,
  rule: `border:0;border-top:1px solid ${BRAND.rule};margin:18px 0;`,
  /**
   * The page is the block and nothing else: no margin, no padding, and
   * width:fit-content so the document is exactly as big as the listings
   * card. A decorative page wash only reads as dead space around it, and body
   * styles don't travel into beehiiv anyway.
   */
  page: 'margin:0;padding:0;width:fit-content;',
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Escapes, then keeps the submitter's line breaks. */
function paragraphHtml(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br />')
}

/** `Jo Ngata · jo@example.co.nz · 021 555 0142`, skipping whatever is missing. */
function contactHtml(listing: BeehiivListing): string {
  const parts: string[] = []

  if (listing.contactName) parts.push(escapeHtml(listing.contactName))
  if (listing.contactEmail) {
    const email = escapeHtml(listing.contactEmail)
    parts.push(`<a href="mailto:${email}" style="${STYLES.link}">${email}</a>`)
  }
  if (listing.contactPhone) parts.push(escapeHtml(listing.contactPhone))

  if (parts.length === 0) return ''
  return `<p style="${STYLES.contact}">${parts.join(' &middot; ')}</p>`
}

/**
 * A link only becomes a button if it is one we can vouch for. The form already
 * insists on http(s), but a listing seeded or imported around it shouldn't be
 * able to put anything else behind a button in someone's newsletter.
 */
function linkUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return /^https?:\/\/\S/i.test(trimmed) ? trimmed : null
}

/** The "More info" button under the copy, for listings that carry a link. */
function moreInfoHtml(listing: BeehiivListing): string {
  const url = linkUrl(listing.url)
  if (!url) return ''
  return `<p style="${STYLES.buttonWrap}"><a href="${escapeHtml(url)}" style="${
    STYLES.button
  }">More info</a></p>`
}

/**
 * The image on a featured listing, printed between the when-and-where line and
 * the copy. Same vouching as the button: only an absolute http(s) URL is
 * printed, so nothing else can be loaded into a reader's inbox.
 */
function imageHtml(listing: BeehiivListing): string {
  const url = linkUrl(listing.imageUrl)
  if (!url) return ''
  return `<img src="${escapeHtml(url)}" alt="${escapeHtml(
    listing.headline
  )}" style="${STYLES.image}" />`
}

function listingHtml(listing: BeehiivListing): string {
  return [
    `<p style="${STYLES.headline}">${escapeHtml(listing.headline)}</p>`,
    listing.meta ? `<p style="${STYLES.meta}">${escapeHtml(listing.meta)}</p>` : '',
    imageHtml(listing),
    `<p style="${STYLES.body}">${paragraphHtml(listing.body)}</p>`,
    moreInfoHtml(listing),
    contactHtml(listing),
  ]
    .filter(Boolean)
    .join('\n      ')
}

/** Groups listings by category label, keeping the order they arrived in. */
function groupByCategory(listings: BeehiivListing[]): [string, BeehiivListing[]][] {
  const groups = new Map<string, BeehiivListing[]>()
  for (const listing of listings) {
    const group = groups.get(listing.category)
    if (group) group.push(listing)
    else groups.set(listing.category, [listing])
  }
  return [...groups]
}

export type BeehiivOptions = {
  /** Heading above the block, e.g. "Classifieds". */
  title?: string
  /** Line under the heading — the issue it was built for, usually. */
  subtitle?: string
  /**
   * Group listings under a category heading. On by default, and right for
   * classifieds. Events pass false: they are already in date order, and
   * chopping them into categories breaks the one thing a reader scans for.
   */
  groupByCategory?: boolean
}

export function toBeehiivHtml(
  listings: BeehiivListing[],
  options: BeehiivOptions = {}
): string {
  const title = options.title ?? 'Classifieds'
  const grouped = options.groupByCategory ?? true
  const groups: [string, BeehiivListing[]][] = grouped
    ? groupByCategory(listings)
    : [['', listings]]

  // With everything in one category, the category heading says nothing the
  // section heading hasn't already said.
  const showCategories = grouped && groups.length > 1

  const sections = groups.map(([category, group]) => {
    const heading = showCategories
      ? `<p style="${STYLES.categoryTitle}">${escapeHtml(category)}</p>\n      `
      : ''
    const items = group
      .map((listing) => `<div>\n      ${listingHtml(listing)}\n    </div>`)
      .join(`\n    <hr style="${STYLES.rule}" />\n    `)
    return `    ${heading}${items}`
  })

  const body = sections.join(`\n    <hr style="${STYLES.rule}" />\n`)

  return `<!doctype html>
<html lang="en-NZ">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
</head>
<body style="${STYLES.page}">
<!--
  ${listings.length} listing${listings.length === 1 ? '' : 's'} for beehiiv,
  styled to The Tide's brand guide: system type, Paper surface, Deep Harbor
  text, Steel Blue eyebrows and links, one Sea Glass accent rule.

  Two ways in, whichever suits your post:
    1. Open this file in a browser, select all, copy, and paste into the
       beehiiv editor. Headings, bold and the email links come across.
    2. Or paste the <div> below into a custom HTML block.

  Styles are inline so they survive either route.
-->
<div style="${STYLES.wrapper}">
    <p style="${STYLES.sectionTitle}">${escapeHtml(title)}</p>${
      options.subtitle
        ? `\n    <p style="${STYLES.intro}">${escapeHtml(options.subtitle)}</p>`
        : ''
    }
    <hr style="${STYLES.titleRule}" />
${body}
</div>
</body>
</html>
`
}

/** `the-tide-classifieds-2026-08-05.html` */
export function beehiivFilename(base: string, now = new Date()): string {
  return `${base}-${now.toISOString().slice(0, 10)}.html`
}
