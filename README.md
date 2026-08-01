# The Tide — Ad Manager

A single-operator web app for running advertising sales on *The Tide*, a weekly
local email newsletter. It replaces a spreadsheet/Notion setup and does three
jobs:

1. **CRM** — track advertisers through a sales pipeline and see what each has spent.
2. **Bookings** — sell ad slots into specific issues, store the ad copy and creative, track payment.
3. **Inventory + dashboard** — never double-sell a slot, and see revenue, outstanding invoices and sell-through at a glance.

Internal tool, one user, runs locally. No multi-tenant, no public signup, no auth in v1.

Two principles run through the whole app:

- **Inventory control** — each issue has a fixed number of slots per ad type, and the app blocks or clearly flags overselling.
- **Clean export** — every list exports to CSV so the data can migrate to a dedicated tool (Sponsy or similar) with nothing lost.

## Getting started

```bash
npm install
npx prisma migrate dev     # creates prisma/dev.db and applies the schema
npm run seed               # sample advertisers, issues and bookings
npm run dev                # http://localhost:3000
```

No external services and no environment variables are required — the SQLite file
path is hardcoded in `prisma/schema.prisma`, so a fresh clone runs as-is.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` / `npm start` | Production build and serve |
| `npm run seed` | Reset the sample data (leaves Settings alone) |
| `npm test` | Inventory rule tests (`node --test`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:reset` | Drop, re-migrate and re-seed the database |

## Tech

- **Next.js 14 (App Router) + TypeScript**, Server Actions for all writes
- **Tailwind CSS** with shadcn/ui-style components under `components/ui`
- **SQLite via Prisma** — one local file, zero config
- **Recharts** for the dashboard charts
- **Zod** schemas in `lib/validation.ts`, shared by client forms and server actions
- **date-fns** for dates; **sonner** for toasts

### Moving to Postgres

Change the datasource in `prisma/schema.prisma` and re-run `prisma migrate dev`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

No application code changes are needed — nothing outside that file knows which
engine is in use.

### Moving creative uploads off local disk

Uploads land in `public/uploads` via a single seam, `saveFile()` in
`lib/upload.ts`. Point that one function at S3 or Supabase Storage and return the
public URL; callers only ever see the returned string, which is stored on
`Booking.creativeUrl`.

## Business rules

### Inventory capacity, per issue

| Ad type | Slots per issue | Group |
|---|---|---|
| Headline (native) | 1 | headline |
| Feature (native) | 1 | feature |
| Bulletin – Classified | shares 3 | bulletin |
| Bulletin – Banner | shares 3 | bulletin |
| Bulletin Takeover | 1 (consumes all 3 bulletin slots) | bulletin |
| Section Sponsor | 1 per section | section (keyed by section) |
| Featured Event | 1 | featured_event |

- Headline / Feature / Featured Event: max 1 per issue each.
- Bulletin: 3 slots per issue (configurable in Settings). A `BULLETIN_TAKEOVER`
  consumes all of them, so it can't coexist with any other bulletin booking.
- Section Sponsor: max 1 per issue *per section* (Weather, What's On, Gigs,
  Sports, Pet of the Week, Digest). Two different sections can each have a sponsor.
- `CANCELLED` bookings don't count against capacity. `RESERVED` ones do — a
  reservation holds the slot.
- **Confirming** (or marking Ran) a booking that would exceed capacity is
  **blocked** with a clear message. **Reserving** one is allowed but warns, and
  the issue is flagged oversold.

All of this lives in `lib/inventory.ts` and is covered by `lib/inventory.test.ts`.
The issue detail and the dashboard read the same `CapacityReport`, so the numbers
can never disagree.

### Content-to-ad ratio

Target 3:1 content-to-ad. Informational only: the issue detail shows ads sold
against a soft target (default 10 slots ≈ sold out). It never blocks anything.

### Statuses

- **Advertiser pipeline:** `PROSPECT → PITCHED → WON → ACTIVE`, plus `PAUSED`, `LOST`
- **Booking:** `RESERVED → CONFIRMED → RAN`, plus `CANCELLED`
- **Payment:** `UNPAID → INVOICED → PAID`

## Pages

| Route | What's there |
|---|---|
| `/` | Dashboard — KPI cards, three charts, upcoming issues, chase list, pipeline snapshot. Period selector (month/quarter/year/all) drives every widget. |
| `/advertisers` | Table and pipeline (Kanban) views, filters, search, CSV export |
| `/advertisers/[id]` | Contact details, rollup totals, that advertiser's bookings |
| `/bookings` | Table, calendar and unpaid ("chase list") views, filters, CSV export |
| `/bookings/new`, `/bookings/[id]` | Booking form — section field appears only for Section Sponsor, creative upload with preview, live inventory check |
| `/issues` | Table and calendar views, CSV export |
| `/issues/[id]` | Capacity panel, content-to-ad indicator, bookings, and a publish checklist (the build sheet for send day) |
| `/settings` | Bulletin capacity, soft sold-out target, default price per ad type |

List filters and view toggles live in the URL, so any filtered view is a
shareable link and the dashboard deep-links straight into one.

## CSV export

`lib/csv.ts` holds one `exportCsv(rows, columns, filename)` helper. Rows are
flattened on the server (derived totals included) so column sets stay plain data.

- **Advertisers:** Name, Category, Status, Contact name, Email, Phone, Website, Reviews checked, Last contacted, Total booked, Total paid, Notes
- **Bookings:** Label, Advertiser, Ad type, Section, Issue, Publish date, Price, Status, Paid, CTA URL, Copy, Notes
- **Issues:** Title, Publish date, Status, Ads sold, Revenue, Theme

## Project layout

```
app/
  page.tsx              dashboard
  advertisers/          list, pipeline board, detail, server actions
  bookings/             list, form, new + edit routes, server actions
  issues/               list, detail (capacity + checklist), server actions
  settings/
components/
  ui/                   shadcn/ui-style primitives
  dashboard/            KPI card, charts
  *.tsx                 page header, sidebar, status pill, filters, calendar
lib/
  enums.ts              the enumerated values + display labels
  inventory.ts          capacity report and the confirm check
  validation.ts         Zod schemas shared by forms and actions
  csv.ts  upload.ts  settings.ts  rollups.ts  period.ts
prisma/
  schema.prisma  seed.ts
```

## Notes on the seed data

Sample issues are anchored to the next three Thursdays rather than fixed
calendar dates, so a fresh clone always opens on a populated dashboard instead
of an empty "this month". Re-running `npm run seed` replaces the sample rows and
leaves your Settings untouched.

## Not in v1

Single-password auth for self-hosting, multi-date booking packages, invoice PDFs
and Stripe links, client-facing advertiser reports, a recurring-issue generator,
and a rate card generated from Settings prices.
