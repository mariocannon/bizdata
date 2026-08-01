# Roadmap — things we want to build

Ideas for where The Tide Ad Manager goes after v1. This is the *what could this
become* list; [TODO.md](TODO.md) is the *what needs doing next* list. An item
graduates from here to there when it's decided and scoped.

Nothing here is committed. Items are grouped by the job they do for the
business, not by which part of the codebase they touch.

**Sizing** is rough effort, not priority:
`S` a sitting · `M` a few sessions · `L` a project · `XL` changes the shape of the app

---

## 1. Sell more

The app currently records sales that have already happened. These make it help
*cause* them.

| | Idea | Size |
|---|---|---|
| 1.1 | **Renewal radar.** Advertisers whose last booking has run and who have nothing upcoming, ranked by lifetime spend. The single highest-value list in a newsletter ad business — repeat sales are cheaper than new ones, and right now nothing surfaces them. | M |
| 1.2 | **Follow-up reminders.** `lastContacted` exists on `Advertiser` but nothing acts on it. Flag prospects gone quiet for N days, on the dashboard next to the chase list. | S |
| 1.3 | **Multi-date packages.** Sell one advertiser into N issues in a single flow — "4 weeks of Bulletin Banner" — with a package price split across the bookings. The most-requested thing in newsletter sales and the most common reason to reach for a spreadsheet instead. | L |
| 1.4 | **Rate card generator.** Render Settings' default prices as a shareable page or PDF to send a prospect. Cheap to build, immediately useful, keeps quoted prices consistent with what the app charges. | S |
| 1.5 | **Prospect import.** Paste or CSV-upload a list of local businesses into `PROSPECT`. Beats typing them one at a time when working a new category. | M |
| 1.6 | **Waitlist for sold-out slots.** When an issue is full, record who wanted in. Feeds 1.1 and turns a "no" into the first call for the next issue. | M |
| 1.7 | **Pipeline value.** Weight `PITCHED` advertisers by likely spend so the pipeline board shows money, not just cards. Needs an expected-value field on `Advertiser`. | S |

## 2. Get paid faster

`UNPAID → INVOICED → PAID` is tracked but every transition is manual.

| | Idea | Size |
|---|---|---|
| 2.1 | **Invoice PDFs.** Generate an invoice from a booking (or a package) with the newsletter's branding. Removes the separate accounting-tool step. | M |
| 2.2 | **Stripe payment links.** Attach a link to the invoice so `INVOICED → PAID` can happen without chasing. Webhook flips the status automatically. | L |
| 2.3 | **Chase automation.** Draft the follow-up email for anything unpaid past its issue date. Even a copy-to-clipboard draft removes the writing step. | M |
| 2.4 | **Overdue ageing.** Sort and colour the chase list by *how* overdue, not just by date — 7/14/30+ day buckets. | S |
| 2.5 | **Accounting export.** A CSV shaped for Xero or MYOB, not just the generic booking export. | S |
| 2.6 | **Money as integer cents.** `Booking.price` is a `Float`. Fine for whole-dollar ad prices today, wrong the first time something lands on a half-cent after a package split (1.3) or a percentage discount. Worth fixing *before* those exist, not after. | S |

## 3. Send day

The issue detail has a publish checklist. This is the rest of the production
workflow.

| | Idea | Size |
|---|---|---|
| 3.1 | **Build sheet export.** One page per issue with every confirmed ad's copy, creative and CTA URL in running order, ready to paste into the newsletter tool. The thing that gets used every single week. | M |
| 3.2 | **Bulk status updates.** After the send, mark every booking in an issue `RAN` in one action instead of one at a time. | S |
| 3.3 | **Creative validation.** Warn on upload when an image is the wrong aspect ratio or under a minimum width for its ad type. Catches the problem at booking time rather than on send day. | M |
| 3.4 | **Copy length guidance.** Character targets per ad type on the booking form, shown as you type. | S |
| 3.5 | **Recurring issue generator.** Create the next N Thursdays in one action. Small, and removes a recurring chore. | S |
| 3.6 | **Newsletter platform push.** Send the built issue's ad blocks straight into Beehiiv/Mailchimp/whatever via API, instead of copy-paste. Only worth it once 3.1 exists and the format has settled. | XL |

## 4. Prove it worked

Nothing in the app currently tells an advertiser they got value, which is what
renewals are actually argued on.

| | Idea | Size |
|---|---|---|
| 4.1 | **Click tracking.** Wrap `ctaUrl` in a redirect that counts clicks per booking. The single biggest upgrade to the app's usefulness — it turns every renewal conversation from "did you like it?" into a number. Needs a new table and a public route outside the password gate. | L |
| 4.2 | **Advertiser reports.** A shareable page per advertiser: what ran, when, how it performed. Follows 4.1 — without click data it's just a receipt. | M |
| 4.3 | **Issue performance.** Once opens/clicks come back from the newsletter platform, show them against each issue's ad load. | L |
| 4.4 | **Screenshot archive.** Store a rendered image of each sent issue so an advertiser can be shown exactly how their ad appeared. | M |

## 5. Know the business

| | Idea | Size |
|---|---|---|
| 5.1 | **Yield per slot type.** Which ad types actually earn — revenue per slot, sell-through rate, average discount off the Settings price. Directly informs what to raise prices on. | M |
| 5.2 | **Category concentration.** Revenue share by advertiser category, flagging over-reliance on one sector (Real Estate carrying the newsletter is a risk worth seeing). | S |
| 5.3 | **Advertiser lifetime value + churn.** Who's growing, who's quietly stopped. | M |
| 5.4 | **Forecast.** Committed revenue for the next N issues from `RESERVED` + `CONFIRMED`, against a target. | M |
| 5.5 | **Price-change history.** Track what was actually charged over time versus the rate card, so discounting is visible. Needs 2.6 first. | S |

## 6. If it outgrows one operator

Only relevant if the newsletter grows or a second one appears. Listed so the
decisions are visible, not because they're near.

| | Idea | Size |
|---|---|---|
| 6.1 | **Per-user accounts.** The README already flags shared-password auth as the thing to revisit when more than one person needs access. Bring an audit trail with it — who changed a booking's price and when. | L |
| 6.2 | **Multiple newsletters.** One install running ads for several titles. Touches every query and every capacity rule; a genuine rewrite of the data layer, not a feature. | XL |
| 6.3 | **Advertiser self-serve.** Let an advertiser upload their own creative and copy against a booking via a magic link. Removes the most tedious data entry, adds a whole public surface to secure. | XL |
| 6.4 | **Public API / webhooks.** For anything the app doesn't do itself. | L |

## 7. Data model changes these imply

Worth knowing before committing to the features above, because each is easier
now than after real data accumulates.

- **Multiple contacts per advertiser.** `contactName` / `email` / `phone` are
  single fields on `Advertiser`. Larger clients have an accounts person and a
  marketing person. Needs a `Contact` table (1.5, 2.3).
- **A `Package` entity.** 1.3 needs bookings to belong to an optional package
  carrying its own price and date range.
- **Structured `defaultPrices`.** Currently a JSON string in `Settings`. Fine
  for one flat price per ad type; not enough for seasonal rates, package rates
  or per-advertiser negotiated rates (1.4, 5.5).
- **Creative lifecycle.** Nothing deletes from the Supabase `creative` bucket
  when a booking is deleted. Orphan files accumulate silently.
- **Audit trail.** No history on anything. 6.1 needs it, and 5.5 wants it.
- **`Booking.label` is denormalised text.** Rename an advertiser and every old
  label still says the old name. Worth deriving instead of storing.

---

## Deliberately not doing

Recording these so they don't get re-litigated every few months.

- **Programmatic/self-serve ad marketplace.** Wrong model for a local weekly —
  the value is the operator's relationships, not automated fill.
- **Full CRM.** Deal stages, email sequences, activity logging. If the pipeline
  ever needs that much machinery, integrate a real CRM rather than growing one.
- **Multi-tenant SaaS.** 6.2 is one operator running several titles, which is a
  different thing from selling this to other newsletters. That's a product
  decision, not a backlog item.
