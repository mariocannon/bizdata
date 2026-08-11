# The Tide — Ad Manager

Next.js 14 (App Router) + Prisma/Postgres. A single-operator tool for running ad
sales on *The Tide*, a weekly Hibiscus Coast email newsletter.

- `npm run dev` — dev server on :3000
- `npm run typecheck` — `tsc --noEmit`
- `npm test` — rule tests (`node --test`)
- `npm run build` — production build

`README.md` covers setup and deployment; `docs/MANUAL.md` is the operator's
guide.

## Branding — read this before touching anything visual

**[`docs/BRANDING.md`](docs/BRANDING.md) is binding.** It is the brand guide for
The Tide, and everything a person sees follows it: the ad manager, the public
submission forms, the sign-in screen, exported newsletter HTML, docs.

The short version:

- **Use the tokens.** Brand colours live in `app/globals.css` (HSL custom
  properties) and `tailwind.config.js` (named utilities). Never hardcode a hex,
  and never use a Tailwind default colour (`sky-*`, `emerald-*`, `amber-*`,
  `slate-*`, `red-*`) where a brand or state token exists.
- **No web fonts, ever.** The Tide runs on the system UI stack. Don't add
  `next/font`, Google Fonts or a self-hosted face — the speed is part of the
  brand.
- **Sea Glass fills, it never letters.** `#a2c5d3` as text fails contrast
  everywhere. Use Steel Blue or a dark step off the `tide-*` ramp.
- **Public pages go through `<BrandShell>`** (`components/brand/`), which gets
  the wash, logo, eyebrow, waves and spacing right by default.
- **The logo is never recoloured, redrawn or put on a dark ground.** Use
  `<TideMark>` where the ground is dark.
- **Voice:** warm, local, unhurried. Speak to "Coasties" like a neighbour.
  One clear action per public page.

If you need something the guide doesn't cover, add it to `docs/BRANDING.md`
first — and mark it as an extension — then use it.

## Conventions

- Server Components by default; `'use client'` only where interaction demands it.
- Mutations are server actions in `actions.ts` next to the page, except the two
  public forms, which are route handlers under `app/api/` with their own
  validation and rate limits.
- `middleware.ts` gates the whole app behind a shared password. `PUBLIC_PATHS`
  and the matcher exclusions are the only ways through — add to them
  deliberately.
- Money and counts render on `.tabular` so columns line up.
