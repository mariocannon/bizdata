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
npm run seed               # sample advertisers, issues, bookings, classifieds
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
| `npm test` | Inventory and classified rule tests (`node --test`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:reset` | Drop, re-migrate and re-seed the database |
| `npm run preflight` | Check deployment env vars are well-formed |

Deployment lives on Netlify with Supabase for Postgres and creative storage —
see [Deploying](#deploying-to-netlify--supabase).

**Using the app day to day is documented separately in
[docs/MANUAL.md](docs/MANUAL.md)** — pages, business rules, workflows and
troubleshooting, written for the person running ad sales rather than for a
developer.

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
every route including the server actions that pages POST back to. The only
exception is the public classified form described [below](#the-public-classified-form).

| `AUTH_PASSWORD` | Environment | Behaviour |
|---|---|---|
| set | any | Password gate on |
| unset | development | Gate off, so a fresh clone just runs |
| unset | production | **Fails closed** — serves 503 rather than exposing data |

The session is a signed, HttpOnly, SameSite=Lax cookie valid for 30 days, signed
with `AUTH_SECRET` (HMAC-SHA256 via Web Crypto, so it runs on the edge). Setting
`AUTH_SECRET` separately means rotating the password doesn't invalidate every
session, and vice versa.

### The public classified form

`/submit` is the page you send to customers, and `/api/classifieds/submit` is
the endpoint it posts to. They are the two entries in `PUBLIC_PATHS` in
`middleware.ts`; everything else still needs the password.

The page reads nothing from the database and renders no app chrome, so there is
nothing on it to leak. The endpoint's only effect is to create one row:

- **The shape is fixed server-side.** `publicClassifiedSchema` accepts a
  headline, body, category and contact details and nothing else. Status, source
  and issue are set by the handler, so a submission always lands as an
  unassigned `DRAFT` tagged `source=PUBLIC` no matter what the payload claims.
  Nothing a stranger sends reaches a reader until you approve it.
- **The word cap is enforced outright**, not just on approval — writing to the
  brief is the point of sending someone the form.
- **A route handler, not a server action.** Server actions are dispatched by an
  ID in the `Next-Action` header rather than by the route they were posted to,
  so an open route that accepts them is a doorway to *every* action in the app.
  Middleware refuses action posts on public paths outright.
- **Rate limit** of 5 submissions per IP per 10 minutes (`lib/rate-limit.ts`),
  plus a honeypot field, a minimum time-on-page, and a 16 KB body cap. The
  limiter is in-memory, so on serverless each instance counts separately and the
  real limit is looser — it stops a naive flood, and it's the seam to swap for
  Postgres or Redis if that ever isn't enough.
- **Fails closed with the rest of the app.** A production deploy with no
  `AUTH_PASSWORD` serves 503 here too, rather than taking writes from the
  internet into a database nobody can log in to review.

## Deploying to Netlify + Supabase

**1. Supabase — database.** Settings → Database → Connection string. You need
two URIs, and **both come from the pooler**:

| Variable | Which connection | Port |
|---|---|---|
| `DATABASE_URL` | Transaction pooler, plus `?pgbouncer=true&connection_limit=1` | 6543 |
| `DIRECT_URL` | Session pooler | 5432 |

Serverless functions open many short-lived connections, which is what the
transaction pooler is for. Migrations can't run through transaction mode, which
is what `DIRECT_URL` is for.

`pgbouncer=true` is not optional on the transaction pooler. It hands each query
whichever backend is free, while Prisma's prepared statements live on one
backend, so without it the second query fails with Postgres 26000,
`prepared statement "s1" does not exist`. The app repairs the URL at startup if
the parameter is missing (`lib/db-url.ts`) and logs a warning, but set it on the
variable so the configuration is explicit.

Use the **session pooler** for `DIRECT_URL`, not the `db.<ref>.supabase.co`
direct connection. That host is IPv6-only unless you've bought the IPv4 add-on,
and Netlify's build container is IPv4 — `prisma migrate deploy` would fail at
build time with a connection error. Both pooler hostnames look like
`aws-N-ap-southeast-2.pooler.supabase.com`; copy them exactly from the dashboard
rather than typing them, since the `aws-N` prefix varies by project.

**2. Supabase — storage.** Storage → New bucket → name it `creative` and mark it
**public**. Creative images are ads; they're meant to be publicly fetchable. No
bucket policies are needed: uploads use the service-role key, which bypasses
RLS, and reads are public.

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
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → the **secret / `service_role`** key (must be revealed — the anon/publishable key will not work) |
| `SUPABASE_STORAGE_BUCKET` | `creative` |

It has to be the **service_role** key specifically. Supabase ships
`storage.objects` with row-level security on and no policies, so only
`service_role` may write; the anon/publishable key is rejected and every upload
fails with an RLS error that says nothing about keys. Preflight decodes the key
and fails the build if it is the wrong one.

That key bypasses row-level security. It is only ever read in `lib/upload.ts`,
which is marked `server-only`, so it never reaches the browser — but keep it out
of any `NEXT_PUBLIC_` variable.

**5. Deploy.** The build runs `node scripts/preflight.mjs` first, which checks
the environment variables and names anything wrong — a connection string wrapped
in quotes, the API URL pasted into `DATABASE_URL`, an unreplaced
`[YOUR-PASSWORD]` placeholder, a missing `AUTH_PASSWORD` — rather than letting
Prisma fail with a bare `P1013`. It prints connection strings with the password
redacted. You can run it locally too:

```bash
npm run preflight
```

Then `prisma migrate deploy` runs, which creates the
five tables (`Advertiser`, `Issue`, `Booking`, `Classified`, `Settings`) in your Supabase
database and enables row-level security on each. If the project already holds
other tables, these sit alongside them — Prisma only touches what's in this
schema.

Supabase exposes every `public` table through PostgREST, reachable with the anon
key that ships in client bundles. The migration turns RLS on with no policies,
which denies the `anon` and `authenticated` roles outright; the app is
unaffected because Prisma connects as the table owner, and a Postgres table
owner bypasses RLS. Access control for this app lives in `middleware.ts`, not in
Supabase Auth, so there is no legitimate PostgREST caller to write a policy for.
If you later add one, that is where the policies would go.

**6. Seed (optional).** To load the sample data once, run locally with the
Supabase URLs in `.env`:

```bash
npm run seed
```

Skip this if you're going straight to entering real advertisers. **`npm run seed`
deletes all existing advertisers, issues, bookings and classifieds** before inserting the
samples — never point it at a database you care about.

## Reader survey

`/survey` charts the reader survey that the public newsletter site collects. It
answers "what do our readers actually want?" — the topics chart is the headline;
the rest describes who is answering.

### It reads a different database

The survey is **not** in the ad manager's database. It lives in its own Supabase
project, in a `survey_responses` table, and is read directly over the Supabase
API — Prisma is not involved. It gets its own two variables:

| Key | Value |
|---|---|
| `SURVEY_SUPABASE_URL` | The **survey** project's `https://<project-ref>.supabase.co` |
| `SURVEY_SUPABASE_SERVICE_ROLE_KEY` | That project's Settings → API → **secret / `service_role`** key |

Leave them unset and the page explains what's missing rather than erroring, so a
fresh clone still runs.

It has to be the **service_role** key. `survey_responses` has row-level security
on with an INSERT-only policy for `anon`: the public site can post a response,
but nobody can read one back. That's the right shape for a table of reader
demographics, and it means the anon/publishable key returns **zero rows** — the
page would look empty rather than broken. `lib/survey-db.ts` is `server-only`,
so the key is never bundled into client JavaScript.

> Don't "fix" this by adding a public SELECT policy. That would expose every
> reader's demographics to anyone holding the anon key, which is public by design.

### Always live

The requirement is that a refresh shows current data, so nothing is cached: the
route is `force-dynamic`, the page calls `noStore()`, and the Supabase client
fetches with `cache: 'no-store'` (Next.js patches `fetch` and caches it by
default, which would otherwise pin the first response for the life of the
build). One page load is one query.

### Reading the charts

- **Shares are of the people who answered that question**, not of all responses.
  Everything except suburb and topics is optional, so denominators differ from
  card to card — each card states its own `n`.
- **Topics, pets and children's ages are multi-select**, so their shares add up
  to more than 100%.
- **Grey bars are "prefer not to say"** — kept in, because dropping them would
  inflate every other share, but drawn to recede and sorted last.
- **Ordered scales** (age, income, home value, investable assets) keep the
  survey's own order and show empty buckets, since a gap in a scale is itself a
  finding. Unordered lists (suburbs, pets) rank by size and hide options nobody
  picked.
- Under 30 responses the page says so: at that size one new response moves a
  share by several points.

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

### Classifieds

A classified is a short reader listing — **a headline, up to 70 words, and a
phone number or email** — not a sold ad slot. It has its own table and its own tab; it
carries no price or payment status, and it does not consume bulletin inventory.
The `BULLETIN_CLASSIFIED` ad type above is the separate thing: a paid classified
slot booked by an advertiser.

There is no minimum: a listing that says what it needs to in ten words is a good
listing. The 70-word cap is flagged on drafts and enforced on approval,
mirroring how a reservation warns but a confirmation blocks:

- **DRAFT** — any length. Copy arrives overwritten and gets cut down.
- **APPROVED** / **PUBLISHED** — 70 words at most, refused otherwise.
- **ARCHIVED** — has run, or might run again.

At least one of email or phone is required. Word counting lives in
`lib/classifieds.ts`, is covered by `lib/classifieds.test.ts`, and is shared by
the live counter in the form and the Zod schema the server action validates
with, so the two can never disagree.

Listings arrive two ways, recorded in `Classified.source`: `STAFF` for ones you
type in, `PUBLIC` for ones sent through the [public form](#the-public-classified-form).
Submissions land as unassigned drafts and the Classifieds page counts how many
are waiting to be looked at.

### Content-to-ad ratio

Target 3:1 content-to-ad. Informational only: the issue detail shows ads sold
against a soft target (default 10 slots ≈ sold out). It never blocks anything.

### Statuses

- **Advertiser pipeline:** `PROSPECT → PITCHED → WON → ACTIVE`, plus `PAUSED`, `LOST`
- **Booking:** `RESERVED → CONFIRMED → RAN`, plus `CANCELLED`
- **Payment:** `UNPAID → INVOICED → PAID`
- **Classified:** `DRAFT → APPROVED → PUBLISHED`, plus `ARCHIVED`

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
| `/classifieds` | Reader classifieds — headline, up to 70 words, contact. Table and copy views, filters, CSV export |
| `/survey` | Reader survey — what readers say they want, plus where they live and who they are. Read live from a separate Supabase project on every load. |
| `/settings` | Bulletin capacity, soft sold-out target, default price per ad type |
| `/submit` | **Public.** The form you send to customers to place a classified. No password, reads nothing, writes an unassigned draft |

List filters and view toggles live in the URL, so any filtered view is a
shareable link and the dashboard deep-links straight into one.

## CSV export

`lib/csv.ts` holds one `exportCsv(rows, columns, filename)` helper. Rows are
flattened on the server (derived totals included) so column sets stay plain data.

- **Advertisers:** Name, Category, Status, Contact name, Email, Phone, Website, Reviews checked, Last contacted, Total booked, Total paid, Notes
- **Bookings:** Label, Advertiser, Ad type, Section, Issue, Publish date, Price, Status, Paid, CTA URL, Copy, Notes
- **Issues:** Title, Publish date, Status, Ads sold, Revenue, Theme
- **Classifieds:** Headline, Copy, Words, Category, Status, Source, Issue, Publish date, Contact name, Email, Phone, Notes

## Project layout

```
app/
  (app)/                everything behind the password gate
    page.tsx            dashboard
    advertisers/        list, pipeline board, detail, server actions
    bookings/           list, form, new + edit routes, server actions
    issues/             list, detail (capacity + checklist), server actions
    survey/             reader survey charts (reads the survey Supabase project)
    settings/
  login/                the password gate
  submit/               the public classified form (no password)
  api/classifieds/
    submit/             the endpoint that form posts to
middleware.ts           enforces the gate on every route bar the two public ones
components/
  ui/                   shadcn/ui-style primitives
  dashboard/            KPI card, charts
  survey/               survey distribution + responses-per-day charts
  *.tsx                 page header, sidebar, status pill, filters, calendar
lib/
  auth.ts               password check + signed session cookie
  enums.ts              the enumerated values + display labels
  inventory.ts          capacity report and the confirm check
  classifieds.ts        word counting and the 70-word cap
  rate-limit.ts         fixed-window limiter for the public endpoint
  validation.ts         Zod schemas shared by forms and actions
  survey-db.ts          client for the separate survey Supabase project
  survey.ts             survey option lists, roll-ups and distributions
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
