/**
 * Renders published classifieds as a block of HTML to drop into a beehiiv post.
 *
 * beehiiv has no classifieds importer, so the file is built to suit the two
 * ways anything gets into a post: open it in a browser and copy the rendered
 * page (beehiiv keeps the headings, bold and links on paste), or paste the
 * markup itself into a custom HTML block. Styles are therefore inline — email
 * builders drop `<style>` blocks — and the markup stays to tags every editor
 * understands: headings, paragraphs, links, rules.
 *
 * The file holds the classifieds block and nothing else, so "select all, copy"
 * is exactly the block. The how-to lives in an HTML comment, which renders
 * nowhere and is harmless if it gets pasted along with the markup.
 */

export type BeehiivListing = {
  headline: string
  body: string
  /** Display label, e.g. "For sale". */
  category: string
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
}

const STYLES = {
  // Single quotes inside the font stack on purpose: these strings land inside a
  // double-quoted style attribute, and a double quote here would close it early
  // and silently drop every declaration after it.
  wrapper:
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#111827;",
  sectionTitle: 'font-size:20px;font-weight:700;margin:0 0 4px;',
  intro: 'font-size:14px;color:#6b7280;margin:0 0 20px;',
  categoryTitle:
    'font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#0f766e;margin:24px 0 10px;',
  headline: 'font-size:16px;font-weight:700;margin:0 0 4px;',
  body: 'margin:0 0 6px;',
  contact: 'font-size:14px;color:#4b5563;margin:0;',
  link: 'color:#0f766e;',
  rule: 'border:0;border-top:1px solid #e5e7eb;margin:16px 0;',
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

function listingHtml(listing: BeehiivListing): string {
  return [
    `<p style="${STYLES.headline}">${escapeHtml(listing.headline)}</p>`,
    `<p style="${STYLES.body}">${paragraphHtml(listing.body)}</p>`,
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
}

export function toBeehiivHtml(
  listings: BeehiivListing[],
  options: BeehiivOptions = {}
): string {
  const title = options.title ?? 'Classifieds'
  const groups = groupByCategory(listings)

  // With everything in one category, the category heading says nothing the
  // section heading hasn't already said.
  const showCategories = groups.length > 1

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
<body>
<!--
  ${listings.length} classified${listings.length === 1 ? '' : 's'} for beehiiv.

  Two ways in, whichever suits your post:
    1. Open this file in a browser, select all, copy, and paste into the
       beehiiv editor. Headings, bold and the email links come across.
    2. Or paste the markup below into a custom HTML block.

  Styles are inline so they survive either route.
-->
<div style="${STYLES.wrapper}">
    <p style="${STYLES.sectionTitle}">${escapeHtml(title)}</p>${
      options.subtitle
        ? `\n    <p style="${STYLES.intro}">${escapeHtml(options.subtitle)}</p>`
        : ''
    }
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
