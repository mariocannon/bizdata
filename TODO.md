# TODO — The Tide Ad Manager

Working backlog. Newest thinking at the top of each section; check items off in
place rather than deleting them, so the file doubles as a record of what shipped.

Legend: `[ ]` open · `[x]` done · `[~]` in progress · `[?]` needs a decision

---

## Now

Things worth doing next, roughly in order.

- [ ] **Verify the production deploy end to end.** Sign in on the Netlify URL,
      create an advertiser → issue → booking, upload a creative, confirm the file
      lands in the Supabase `creative` bucket and the URL renders.
- [ ] **Enter real data.** Replace the seed rows with actual advertisers and the
      real issue calendar. Remember `npm run seed` wipes advertisers, issues and
      bookings — don't run it against production once real data is in.
- [ ] **Back up the database.** Confirm Supabase's automatic backups are on for
      the project, and note the restore steps somewhere findable.
- [ ] **CI on push.** No `.github/workflows` yet — add one that runs
      `npm run typecheck`, `npm test` and `npm run lint` so a broken build is
      caught before Netlify does it.

## Testing

Coverage today is `lib/inventory.test.ts` and `lib/db-url.test.ts` only.

- [ ] Tests for `lib/rollups.ts` — total booked vs total paid, per advertiser.
- [ ] Tests for `lib/period.ts` — month/quarter/year/all boundaries, especially
      the edges (first and last day of a period).
- [ ] Tests for `lib/csv.ts` — escaping for commas, quotes and newlines inside
      ad copy and notes.
- [ ] Tests for `lib/auth.ts` — cookie signing and verification, and that a
      tampered signature is rejected.
- [ ] A smoke test that every server action rejects invalid input via its Zod
      schema, rather than trusting the client form.

## Product — v2 candidates

Carried over from "Not in v1" in the README. Longer-range ideas live in
[ROADMAP.md](ROADMAP.md); an item moves here once it's decided and scoped.

- [ ] **Multi-date booking packages.** Sell one advertiser into N issues in a
      single flow, with a package price split across the bookings.
- [ ] **Invoice PDFs + payment links.** Generate an invoice from a booking;
      Stripe link so the `INVOICED → PAID` step can happen without chasing.
- [ ] **Client-facing advertiser reports.** A shareable summary of what an
      advertiser ran and what it cost.
- [ ] **Recurring issue generator.** Create the next N weekly issues in one
      action instead of hand-entering each Thursday.
- [ ] **Rate card from Settings.** Render the default prices per ad type as a
      page (or PDF) that can be sent to a prospect.
- [ ] **Bulk status updates.** Select several bookings and mark them Ran or Paid
      together — the post-send-day workflow is one at a time right now.
- [ ] **Renewal prompts.** Surface advertisers whose last booking has run and who
      have nothing upcoming, on the dashboard next to the chase list.

## Polish

- [ ] Empty states on every list — check `/advertisers`, `/bookings`, `/issues`
      all use `components/ui/empty-state.tsx` consistently.
- [ ] Keyboard shortcut or quick-add for a new booking from the issue detail page.
- [ ] Sort the chase list by how overdue an invoice is, not just by date.
- [ ] Mobile pass on the tables — they're the least usable thing on a phone.
- [ ] Confirm the dashboard charts read correctly in dark mode (if enabled) and
      that the colours survive being printed or screenshotted.

## Ops / housekeeping

- [ ] Document the password rotation steps: change `AUTH_PASSWORD`, leave
      `AUTH_SECRET` alone to keep sessions alive (and vice versa).
- [ ] Decide on a retention policy for creative uploads — nothing deletes files
      from the `creative` bucket when a booking is deleted.
- [ ] `npm audit` and a dependency refresh; Next.js is pinned at 14.2.35.
- [ ] Add `npm run preflight` guidance to the deploy checklist for anyone who
      isn't the original operator.

## Open questions

- [ ] Does the 3-slot bulletin capacity still match how the newsletter actually
      lays out? It's configurable in Settings, but the default should be right.
- [ ] Is `RESERVED` holding a slot the correct behaviour, or should reservations
      expire after N days so stale holds don't block real sales?
- [ ] At what point does this need per-user accounts instead of one shared
      password? (README flags this as the trigger for revisiting auth.)

---

## Done

- [x] Password gate via `middleware.ts`, covering server actions too, failing
      closed in production when `AUTH_PASSWORD` is unset.
- [x] Netlify + Supabase deployment, with `scripts/preflight.mjs` checking the
      environment variables before the build runs.
- [x] Row-level security enabled on the app tables and on Prisma's migrations
      table.
- [x] `pgbouncer=true` repair in `lib/db-url.ts` so the transaction pooler stops
      breaking Prisma's prepared statements.
- [x] Inventory rules and capacity report in `lib/inventory.ts`, shared by the
      issue detail and the dashboard so the numbers can't disagree.
- [x] CSV export for advertisers, bookings and issues.
