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

You need a Postgres database. Either point at your Supabase project or run one
locally:

```bash
docker run -d --name tide-db -e POSTGRES_PASSWORD=tide -p 5432:5432 postgres:16
```

Then:

```bash
npm install
cp .env.example .env       # set DATABASE_URL and DIRECT_URL
npx prisma migrate dev     # applies the schema
npm run seed               # sample advertisers, issues and bookings
npm run dev                # http://localhost:3000
```

Locally `DATABASE_URL` and `DIRECT_URL` can be the same value, and you can leave
`AUTH_PASSWORD` and the Supabase storage keys unset — the password gate stays
off in development and creative uploads fall back to `./public/uploads`.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` / `npm start` | Production build and serve |
| `npm run seed` | Reset the sample data (leaves Settings alone) |
| `npm test` | Inventory rule tests (`node --test`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:reset` | Drop, re-migrate and re-seed the database |

Deployment lives on Netlify with Supabase for Postgres and creative storage —
see [Deploying](#deploying-to-netlify--supabase).

## Tech

- **Next.js 14 (App Router) + TypeScript**, Server Actions for all writes
- **Tailwind CSS** with shadcn/ui-style components under `components/ui`
- **Postgres via Prisma** — Supabase in production
- **Recharts** for the dashboard charts
- **Zod** schemas in `lib/validation.ts`, shared by client forms and server actions
- **date-fns** for dates; **sonner** for toasts

### Storage seams

Two drivers, chosen by environment, both behind one function each:

- **Database** — `prisma/schema.prisma` only. Nothing outside that file knows
  which engine is in use.
- **Creative uploads** — `saveFile()` / `deleteFile()` in `lib/upload.ts`. With
  `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set they go to Supabase
  Storage; otherwise to `./public/uploads`. Callers only ever see the returned
  URL string, stored on `Booking.creativeUrl`.

## Authentication

One shared password for the whole app, checked in `middleware.ts`, which covers
every route including the server actions that pages POST back to — there is no
unauthenticated write path.

| `AUTH_PASSWORD` | Environment | Behaviour |
|---|---|---|
| set | any | Password gate on |
| unset | development | Gate off, so a fresh clone just runs |
| unset | production | **Fails closed** — serves 503 rather than exposing data |

The session is a signed, HttpOnly, SameSite=Lax cookie valid for 30 days, signed
with `AUTH_SECRET` (HMAC-SHA256 via Web Crypto, so it runs on the edge). Setting
`AUTH_SECRET` separately means rotating the password doesn't invalidate every
session, and vice versa.

## Deploying to Netlify + Supabase

**1. Supabase — database.** In your project, Settings → Database → Connection
string → URI. You need two: the **pooled** one (port 6543) for `DATABASE_URL`,
and the **direct** one (port 5432) for `DIRECT_URL`. Serverless functions open
many short-lived connections, which is what the pooler is for; migrations can't
run through it, which is what the direct URL is for.

**2. Supabase — storage.** Storage → New bucket → name it `creative` and mark it
**public**. Creative images are ads; they're meant to be publicly fetchable.

**3. Netlify — connect the repo.** Add new site → Import from Git → pick this
repo. `netlify.toml` already sets the build command, the Next.js plugin and the
Node version, so leave the defaults alone.

**4. Netlify — environment variables.** Site configuration → Environment
variables:

| Key | Value |
|---|---|
| `DATABASE_URL` | Supabase pooled URI (port 6543, `?pgbouncer=true&connection_limit=1`) |
| `DIRECT_URL` | Supabase direct URI (port 5432) |
| `AUTH_PASSWORD` | The password you'll use to sign in |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → `service_role` key |
| `SUPABASE_STORAGE_BUCKET` | `creative` |

The service-role key bypasses row-level security. It is only ever read in
`lib/upload.ts`, which is marked `server-only`, so it never reaches the browser —
but keep it out of any `NEXT_PUBLIC_` variable.

**5. Deploy.** The build runs `prisma migrate deploy` first, which creates the
four tables (`Advertiser`, `Issue`, `Booking`, `Settings`) in your Supabase
database. If the project already holds other tables, these sit alongside them —
Prisma only touches what's in this schema.

**6. Seed (optional).** To load the sample data once, run locally with the
Supabase URLs in `.env`:

```bash
npm run seed
```

Skip this if you're going straight to entering real advertisers. **`npm run seed`
deletes all existing advertisers, issues and bookings** before inserting the
samples — never point it at a database you care about.

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
  (app)/                everything behind the password gate
    page.tsx            dashboard
    advertisers/        list, pipeline board, detail, server actions
    bookings/           list, form, new + edit routes, server actions
    issues/             list, detail (capacity + checklist), server actions
    settings/
  login/                the password gate
middleware.ts           enforces the gate on every route
components/
  ui/                   shadcn/ui-style primitives
  dashboard/            KPI card, charts
  *.tsx                 page header, sidebar, status pill, filters, calendar
lib/
  auth.ts               password check + signed session cookie
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

Multi-date booking packages, invoice PDFs and Stripe links, client-facing
advertiser reports, a recurring-issue generator, and a rate card generated from
Settings prices.

Auth is a single shared password, which suits one operator. If more people need
access, that's the point to move to per-user accounts.
