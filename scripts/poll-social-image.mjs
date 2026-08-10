/**
 * Renders a share-ready poll result card as a PNG.
 *
 * The newsletter site collects one-question reader polls into `question_answers`
 * (a boolean `answer` plus an optional free-text `comment`). This turns one of
 * those questions into an image for Instagram/Facebook, in The Tide's brand.
 *
 * The counts below are baked in rather than queried, because the survey project
 * is a separate Supabase instance and this script is meant to run from a laptop
 * without its service-role key. Re-run the query, paste the new numbers, render:
 *
 *   select answer, count(*), count(comment) as comments
 *     from question_answers
 *    where question = '<the question>'
 *    group by answer;
 *
 * Usage:  node scripts/poll-social-image.mjs [outDir]
 * Output: <outDir>/poll-northern-expressway-toll-{square,portrait}.png
 *
 * Chromium comes from PUPPETEER/PLAYWRIGHT's browser dir or CHROME_PATH; any
 * headless Chrome will do — it is only used as a renderer.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

// ── The data ─────────────────────────────────────────────────────────────────

const POLL = {
  question:
    'Do you think we should be tolled on the future Northern Expressway from Warkworth to Te Hana?',
  /** Shortened for the card — the full text above is the one that was asked. */
  headline: 'Should the new Warkworth–Te Hana expressway be tolled?',
  yes: 2,
  no: 5,
  /** As pulled, in NZ time. */
  asAt: '6 August 2026',
  quote: {
    text: 'We all pay enough in tax and the cost of every day living!',
    attribution: 'A reader who voted no',
  },
}

// ── Brand ────────────────────────────────────────────────────────────────────

/** The Tide's palette, matching `BRAND` in lib/beehiiv.ts. */
const BRAND = {
  paper: '#fffdf8',
  foam: '#faf5ea',
  sand: '#f0e7d6',
  deepHarbor: '#23313c',
  slate: '#5a6672',
  seaGlass: '#a2c5d3',
  steelBlue: '#45758c',
}

/**
 * The two answers are an identity pair, so they get two hues rather than two
 * steps of one. Both are brand-adjacent but pushed to pass the palette checks
 * on the Paper surface: lightness band, chroma floor, and CVD separation
 * (ΔE 22.2 protan / 28.7 normal — floors are 8 and 15). The sand hue lands
 * under 3:1 against Paper, which obliges a visible label on every segment;
 * both segments carry their own, inside the fill.
 */
const NO_HUE = '#1a6f9c'
const YES_HUE = '#cc8a33'

// Ink chosen per fill so a label inside a segment always clears contrast.
const ON_NO = '#ffffff'
const ON_YES = BRAND.deepHarbor

// Liberation Sans first: the brand guide asks for the system stack, and this is
// the metric-compatible face present on the render box. On a reader's screen
// the stack resolves to SF or Segoe as intended.
const FONT = "'Liberation Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"

// ── Layout ───────────────────────────────────────────────────────────────────

const SIZES = {
  // Feed square — safe on every platform. Tighter type: the same blocks have
  // 270px less room than the portrait, and the card must not overflow.
  square: {
    width: 1080, height: 1080, pad: 60,
    question: 52, hero: 128, bar: 70, quoteText: 29, quote: true,
  },
  // 4:5 portrait — the tallest Instagram allows, so it takes the most feed space.
  portrait: {
    width: 1080, height: 1350, pad: 76,
    question: 62, hero: 176, bar: 86, quoteText: 32, quote: true,
  },
}

const escapeHtml = (value) =>
  value.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

function card(size) {
  const total = POLL.yes + POLL.no
  // Rounded for display only; the bar is sized off the raw counts.
  const pct = (n) => Math.round((n / total) * 100)
  const noPct = pct(POLL.no)
  const yesPct = pct(POLL.yes)
  const leading = POLL.no >= POLL.yes ? 'no' : 'yes'
  const leadingCount = leading === 'no' ? POLL.no : POLL.yes

  const quote = size.quote && POLL.quote
  const labelSize = Math.round(size.bar * 0.34)

  return `<!doctype html>
<html lang="en-NZ">
<head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${size.width}px; height: ${size.height}px; }
  body {
    font-family: ${FONT};
    background: ${BRAND.paper};
    color: ${BRAND.deepHarbor};
    -webkit-font-smoothing: antialiased;
  }
  .card {
    width: 100%; height: 100%;
    padding: ${size.pad}px;
    display: flex; flex-direction: column;
    /* The guide's Sea Glass edge, so the card reads as The Tide at thumbnail size. */
    border-top: 14px solid ${BRAND.seaGlass};
  }

  .masthead { display: flex; align-items: baseline; gap: 16px; }
  .wordmark { font-size: 34px; font-weight: 700; letter-spacing: -0.02em; }
  .eyebrow {
    font-size: 19px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.18em; color: ${BRAND.steelBlue};
  }
  .rule { border: 0; border-top: 2px solid ${BRAND.sand}; margin: 22px 0 0; }

  .question {
    margin-top: ${Math.round(size.pad * 0.6)}px;
    font-size: ${size.question}px; font-weight: 700;
    letter-spacing: -0.025em; line-height: 1.13;
  }

  /* Slack is split between two gaps rather than pooled into one, which would
     leave the question stranded at the top. A zero min-height lets them collapse
     instead of pushing the footer off the bottom of a fixed-size canvas. */
  .spacer { flex: 1 1 0; min-height: 0; }

  /* The result, and the only loud thing on the card. */
  .figure {
    font-size: ${size.hero}px; font-weight: 700;
    letter-spacing: -0.04em; line-height: 0.95;
    /* Proportional figures: tabular-nums loosens a big standalone number. */
  }
  .figure em { font-style: normal; color: ${NO_HUE}; }
  .say {
    margin-top: 14px;
    font-size: ${Math.round(size.question * 0.62)}px; font-weight: 700;
    letter-spacing: -0.015em; line-height: 1.25; color: ${BRAND.slate};
  }

  /* Part-to-whole: one bar, two segments, separated by Paper rather than a stroke. */
  .bar {
    margin-top: ${Math.round(size.pad * 0.62)}px;
    display: flex; gap: 3px; height: ${size.bar}px;
  }
  .seg {
    display: flex; align-items: center;
    font-size: ${labelSize}px; font-weight: 700; letter-spacing: 0.01em;
  }
  .seg.no {
    background: ${NO_HUE}; color: ${ON_NO};
    border-radius: 8px 2px 2px 8px; padding-left: ${Math.round(size.bar * 0.32)}px;
  }
  .seg.yes {
    background: ${YES_HUE}; color: ${ON_YES};
    border-radius: 2px 8px 8px 2px; padding-left: ${Math.round(size.bar * 0.26)}px;
  }

  .base {
    margin-top: 18px;
    font-size: 25px; color: ${BRAND.slate};
    font-variant-numeric: tabular-nums;
  }

  .quote {
    margin-top: ${Math.round(size.pad * 0.62)}px;
    background: ${BRAND.foam};
    border-left: 6px solid ${BRAND.seaGlass};
    border-radius: 0 10px 10px 0;
    padding: 26px 30px;
  }
  .quote p {
    font-size: ${size.quoteText}px; line-height: 1.34; font-style: italic;
  }
  .quote span {
    display: block; margin-top: 12px;
    font-size: 21px; font-style: normal; color: ${BRAND.slate};
  }

  .foot {
    margin-top: 26px;
    padding-top: 20px;
    border-top: 2px solid ${BRAND.sand};
    display: flex; justify-content: space-between;
    font-size: 21px; color: ${BRAND.slate};
  }
  .foot strong { font-weight: 700; color: ${BRAND.deepHarbor}; }
</style>
</head>
<body>
  <div class="card">
    <div class="masthead">
      <span class="wordmark">The Tide</span>
      <span class="eyebrow">Reader poll</span>
    </div>
    <hr class="rule">

    <p class="question">${escapeHtml(POLL.headline)}</p>

    <div class="spacer"></div>

    <div class="hero">
      <p class="figure"><em>${leadingCount} of ${total}</em></p>
      <p class="say">readers say ${leading === 'no' ? 'NO' : 'YES'} to a toll</p>
    </div>

    <!-- Each segment names its own answer, so identity never rests on colour. -->
    <div class="bar">
      <div class="seg no" style="flex: ${POLL.no}">No · ${noPct}%</div>
      <div class="seg yes" style="flex: ${POLL.yes}">Yes · ${yesPct}%</div>
    </div>
    <p class="base">${POLL.no} no · ${POLL.yes} yes · ${total} responses to ${POLL.asAt}</p>

    <div class="spacer"></div>

    ${
      quote
        ? `<blockquote class="quote">
      <p>&ldquo;${escapeHtml(POLL.quote.text)}&rdquo;
      <span>— ${escapeHtml(POLL.quote.attribution)}</span></p>
    </blockquote>`
        : ''
    }

    <div class="foot">
      <span><strong>Have your say</strong> — vote in this week&rsquo;s issue</span>
      <span>Hibiscus Coast</span>
    </div>
  </div>
</body>
</html>`
}

// ── Render ───────────────────────────────────────────────────────────────────

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean)

/**
 * --window-size sizes the *window*, and a full Chrome build spends ~87px of it
 * on window chrome even headless, so the viewport comes out shorter than asked
 * for and everything below that fold renders blank. chrome-headless-shell has
 * no such offset. Overshooting instead is not a fix: --screenshot captures
 * max(document, viewport), so a too-tall window pads the PNG past the size the
 * card was designed for.
 *
 * So measure it once, on whichever binary is actually being used, and add it.
 */
function viewportOffset(chrome) {
  const probe = join(tmpdir(), `viewport-probe-${process.pid}.html`)
  const asked = 900
  writeFileSync(
    probe,
    '<body><script>document.body.setAttribute("data-h", window.innerHeight)</script></body>'
  )

  const dom = execFileSync(
    chrome,
    [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      `--window-size=800,${asked}`,
      '--dump-dom',
      `file://${probe}`,
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
  )

  const measured = dom.match(/data-h="(\d+)"/)
  rmSync(probe, { force: true })
  return measured ? asked - Number(measured[1]) : 0
}

function findChrome() {
  const found = CHROME_CANDIDATES.find((path) => existsSync(path))
  if (!found) {
    throw new Error(
      `No Chrome found. Set CHROME_PATH. Tried:\n  ${CHROME_CANDIDATES.join('\n  ')}`
    )
  }
  return found
}

const outDir = resolve(process.argv[2] ?? 'public/social')
mkdirSync(outDir, { recursive: true })

const chrome = findChrome()
const offset = viewportOffset(chrome)

for (const [name, size] of Object.entries(SIZES)) {
  const html = join(outDir, `.poll-${name}.html`)
  const png = join(outDir, `poll-northern-expressway-toll-${name}.png`)
  writeFileSync(html, card(size))

  execFileSync(
    chrome,
    [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${size.width},${size.height + offset}`,
      `--screenshot=${png}`,
      `file://${html}`,
    ],
    { stdio: 'pipe' }
  )

  rmSync(html, { force: true })

  // The capture is the document, not the window, so a renderer that disagrees
  // about either shows up here rather than in a silently mis-sized post.
  const ihdr = readFileSync(png).subarray(16, 24)
  const [width, height] = [ihdr.readUInt32BE(0), ihdr.readUInt32BE(4)]
  if (width !== size.width || height !== size.height) {
    throw new Error(`${name}: expected ${size.width}×${size.height}, rendered ${width}×${height}`)
  }

  console.log(`${name.padEnd(9)} ${width}×${height}  →  ${png}`)
}
