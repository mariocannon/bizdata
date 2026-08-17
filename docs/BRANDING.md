# The Tide — brand guidelines

This is the binding brand reference for this repo. Everything visual or verbal
that a person sees — the ad manager, the public submission forms, the sign-in
screen, exported newsletter HTML, screenshots in the docs — follows it.

It is a transcription of *The Tide — Brand Guide*, which was drawn from the live
signup page, plus the small number of extensions this app needs that the source
guide doesn't cover. Extensions are marked as such, so it stays obvious which
decisions came from the brand and which came from us.

**The rule of thumb:** if you're reaching for a colour, a font or a phrase that
isn't in this document, that's the signal to stop — either the answer is already
here under a different name, or the guide needs updating first.

---

## 1. Palette

Thirteen values, grouped by the job they do. These are the *only* brand colours.
They live in two places, and both are generated from this table:

- `app/globals.css` — as HSL custom properties (`--sand`, `--seaglass`, …)
- `tailwind.config.js` — as named utilities (`bg-sand`, `text-steel`, …)

Never hardcode a hex in a component. Use the token.

### Grounds and surfaces

| Name | Hex | Token | Where it goes |
|---|---|---|---|
| Foam | `#faf5ea` | `foam` | Lightest ground — the top of the background gradient |
| Sand | `#f0e7d6` | `sand` | The signature warm ground, the browser `theme-color`, gradient base |
| Paper | `#fffdf8` | `paper` | Input fields and raised surfaces — a hair warmer than pure white |

### Ink and text

| Name | Hex | Token | Where it goes |
|---|---|---|---|
| Deep Harbor | `#23313c` | `harbor` | Primary text and the button label. The brand's near-black |
| Slate | `#5a6672` | `muted-foreground` | Secondary text — taglines and supporting copy |
| Driftwood | `#8a8272` | `driftwood` | Muted helper notes, e.g. "Free forever. Unsubscribe any time." |
| Mist | `#9aa4ac` | `mist` | Input placeholder text — quiet, low-emphasis grey |
| Deep Navy | `#23415a` | `navy` | Border tint, used at 25% alpha on input outlines. Rarely shown solid |

> Slate is exposed as `text-muted-foreground`, not `text-slate`, because
> `slate-*` is a Tailwind built-in and shadowing it would break the scale.

### Accents

| Name | Hex | Token | Where it goes |
|---|---|---|---|
| Sea Glass | `#a2c5d3` | `seaglass` / `primary` | Primary accent — the button fill and the two shoreline waves |
| Steel Blue | `#45758c` | `steel` / `ring` | Secondary accent — eyebrow text, focus rings, button hover shadow |

**Sea Glass is a fill colour, never a text colour.** At 1.6:1 on Paper it fails
every contrast floor. Anything that needs to *read* as the accent takes Steel
Blue or a dark step off the ramp.

**Steel Blue is 4.10:1 on Sand** — under the 4.5:1 floor for body text. Use it
for the eyebrow (bold, uppercase), for links and for rings; not for paragraphs.

### Semantic states

| Name | Hex | Token | Where it goes |
|---|---|---|---|
| Kelp | `#1e7a4d` | `success` | Success — confirmations, paid, published, sent |
| Coral | `#b3372c` | `coral` / `destructive` | Error — invalid input and failed submissions |

### The coastal ramp

For tints and shades of the brand blues, `tide-50` … `tide-900`. Three steps are
brand colours exactly — `tide-300` is Sea Glass, `tide-600` Steel Blue, `tide-800`
Deep Navy, `tide-900` Deep Harbor — and the rest are interpolated between them.
Use the ramp when you need a lighter or darker version of the accent; use the
named token when you mean the brand colour itself.

---

## 2. Signature elements

Two devices carry the brand. Reproduce them exactly — don't redraw, retint or
re-time them.

### The background wash

A soft radial gradient from Foam into Sand, centred at the top of the page. The
shift should be felt more than seen.

```css
background: radial-gradient(120% 90% at 50% 0%, #faf5ea 0%, #f0e7d6 60%);
```

Shipped as the `.brand-wash` class and the `--brand-wash` custom property.

### The tide

Two layered waves in Sea Glass, the back one at 45% opacity and the front at
full, anchored to the foot of the viewport. Path data lives in
`components/brand/tide-waves.tsx` and is copied verbatim from the guide.

Copy must never sit on top of the waves. `BrandShell` reserves
`clamp(7rem, 20vh, 11rem)` of bottom padding for exactly this reason — if you
build a public page by hand, reserve the same.

---

## 3. Typography

**The Tide ships no web fonts.** It uses the reader's own system UI stack, so
the page loads instantly and feels at home on every device. That speed is part
of the brand's promise, so it is a hard rule, not a preference — do not add
`next/font`, Google Fonts, or a self-hosted face.

```css
font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
```

Personality comes from scale, weight and the eyebrow.

| Role | Treatment |
|---|---|
| Eyebrow | 700, uppercase, `letter-spacing: 0.18em`, Steel Blue — the `.eyebrow` class |
| Display / H1 | 800, `letter-spacing: -0.02em`, `text-wrap: balance` |
| Heading / H2 | 800, `letter-spacing: -0.015em` |
| Lede | Slate, `text-wrap: pretty`, max ~42ch |
| Body | Deep Harbor, `line-height: 1.6` |
| Note / caption | Driftwood, small |

Numbers stay on `.tabular` everywhere — this app is mostly money and counts, and
they have to line up column to column.

---

## 4. The logo

`public/brand/tide-logo.webp` — the Sea Glass sunrise roundel above the "THE
TIDE." wordmark, on transparency. Rendered through `<TideLogo>`.

- **Never** recolour, redraw, rotate or stretch it.
- **Only** on a light ground: Foam, Sand or Paper. It is Sea Glass on
  transparency and vanishes on anything dark.
- Clear space: keep at least half the logo's width free on every side.
- Minimum width 4rem — below that the wordmark stops being legible.

For dark grounds — the sidebar, favicons, avatars — use `<TideMark>`: the wave
motif in a Deep Navy tile. It is the only sanctioned alternative lockup.

---

## 5. Components

| Element | Rule |
|---|---|
| Primary button | Sea Glass fill, Deep Harbor label, `0.65rem` radius. On hover it lifts 1px on a Steel Blue shadow at 35% — **it never changes colour** |
| Input | Paper surface, Deep Navy border at 25%. On focus the border goes Steel Blue behind a 3px Sea Glass glow at 55% |
| Placeholder | Mist |
| Status note | Driftwood by default, Coral for errors, Kelp for success |

`--radius` is `0.65rem`, taken from the signup control.

### Listing images (extension)

> The source guide has no photography rules — The Tide had no reader-supplied
> images until featured events. This is the minimum needed to keep one from
> fighting the layout.

A featured event's image runs **full width of the content column**, at the same
`0.65rem`/10px radius as the primary button, with no crop: the picture is
somebody's event, and cropping it to a ratio is a judgement we don't get to
make. On screen it sits on a Sand tint so a transparent PNG still reads as an
image; in the newsletter it sits directly on Paper.

The image never carries the words. Whatever a reader needs to know is in the
copy underneath, so a listing still reads with images turned off — most inboxes
block them by default.

---

## 6. Semantic states (extension)

> The source guide defines two states — Kelp for success, Coral for error. An ad
> manager needs more: things in flight, things agreed, things that need chasing.
> The set below extends the brand rather than departing from it: everything is a
> brand colour except Ochre, which is a new warm tone chosen to sit with Sand and
> Driftwood.

Each state is a triple — `DEFAULT` for text and icons, `soft` for the tint they
sit on, `border` for the outline between them.

| State | Meaning | Base | Contrast on its own tint |
|---|---|---|---|
| `success` | Landed — paid, sent, published, ran | Kelp | 6.1:1 |
| `progress` | In flight — pitched, reserved, drafting, invoiced | Steel Blue | 6.0:1 |
| `attention` | Needs chasing — unpaid, missing copy | **Ochre** (extension) | 5.3:1 |
| `danger` | Wrong, fix now — oversold, failed | Coral | 6.0:1 |
| `neutral` | Dormant or done-with — prospect, paused, archived | Slate on a Sand tint | 5.0:1 |

Sea Glass fills the gap between `progress` and `success` for "agreed but not yet
delivered" — won, confirmed, ready, approved — as `bg-tide-100 text-tide-800`.

Every pairing above clears WCAG AA for normal text. If you add a state, check it
before you ship it.

### Ad type chips

The seven ad types read as one family rather than seven competing hues: premium
placements take the dark end of the coastal ramp, the bulletin family the light
end, sponsors the warm neutral, events Kelp. The type is always spelled out in
the chip, so colour is reinforcement and never the only signal.

### Charts

Chart series colours in `components/dashboard/charts.tsx` and
`components/survey/charts.tsx` are the one documented exemption. They are chosen
and verified for colour-vision deficiency separation against the card surface,
with the ΔE figures recorded in each file. Accessibility wins over palette
purity there. Keep them within the coastal range, and re-verify with the
`dataviz` skill's checker if you change them.

---

## 7. Voice and tone

The copy speaks to **Coasties** like a neighbour, not a marketer. Short,
friendly, never pushy — every line reassures more than it sells.

| Register | Example |
|---|---|
| Welcoming | "You're in good company!" — belonging before benefit |
| Reassuring | "Free forever. Unsubscribe any time." — no fine print, no catch |
| Human on error | "Something went wrong — please try again in a moment." — owns the problem, points at the fix, skips the apology spiral |
| Celebratory | "You're in. Watch your inbox for the next issue." — confirms success and sets the next expectation in one warm breath |

Four principles:

1. **Coastal, not corporate.** Lean on the tide, the shore and "Coasties" — the
   identity is a place, not a product.
2. **Calm over loud.** Soft grounds, one gentle accent, generous space. Nothing
   shouts for attention.
3. **Fast and light.** No web fonts, no external CSS, no images beyond the logo.
   The brand's speed is part of its promise.
4. **One clear action.** Every public page points at a single thing to do. Never
   add a competing call to action.

The internal ad manager is denser than the public pages by necessity, but the
voice doesn't change: empty states, errors and confirmations are written the
same way.

---

## 8. Applying this in the codebase

| You need | Reach for |
|---|---|
| A public-facing page | `<BrandShell>` — wash, logo, eyebrow, waves and spacing, all correct by default |
| The logo | `<TideLogo>` on light, `<TideMark>` on dark |
| The wave motif | `<TideWaves>` inside a `relative overflow-hidden` parent |
| A brand colour | The named Tailwind token — `bg-sand`, `text-harbor`, `text-steel` |
| A state colour | `text-success`, `bg-attention-soft`, `border-danger-border`, … |
| A tint or shade of the accent | The `tide-*` ramp |
| The eyebrow | The `.eyebrow` class |

Things that should fail review:

- A raw hex in a component
- A Tailwind default colour (`sky-*`, `emerald-*`, `amber-*`, `slate-*`, `red-*`)
  where a brand token exists
- Sea Glass used as a text colour
- A web font
- The logo recoloured, redrawn or placed on a dark ground
- Copy on top of the waves
- A second call to action on a public page
