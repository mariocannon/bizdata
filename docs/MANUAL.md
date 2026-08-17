# The Tide — Ad Manager: Operator's Manual

Everything you need to run advertising sales for *The Tide* in this app.

This is the manual for using it. If you're looking for how to deploy or change
it, that's the [README](../README.md).

---

## Contents

1. [What the app is for](#1-what-the-app-is-for)
2. [Signing in](#2-signing-in)
3. [The weekly rhythm](#3-the-weekly-rhythm)
4. [Advertisers](#4-advertisers)
5. [Issues](#5-issues)
6. [Bookings](#6-bookings)
7. [Inventory rules](#7-inventory-rules)
8. [Classifieds](#8-classifieds)
9. [Events](#9-events)
10. [The dashboard](#10-the-dashboard)
11. [Reader survey](#11-reader-survey)
12. [Settings](#12-settings)
13. [Exporting to CSV](#13-exporting-to-csv)
14. [Recipes](#14-recipes)
15. [Troubleshooting](#15-troubleshooting)
16. [Limits and things to know](#16-limits-and-things-to-know)

---

## 1. What the app is for

Three jobs:

| | |
|---|---|
| **CRM** | Track businesses from cold prospect to paying partner, and see what each has spent |
| **Bookings** | Sell ad slots into specific issues, hold the copy and creative, track who's paid |
| **Inventory** | Never double-sell a slot, and see revenue and sell-through at a glance |

Two principles run through all of it:

- **Inventory control.** Each issue has a fixed number of slots. The app blocks
  you from confirming a slot that's already sold, and flags an issue that's
  oversold.
- **Clean export.** Every list exports to CSV, so nothing here is trapped. If you
  outgrow this app, your data leaves with you.

Three things link together: **Advertisers** → **Bookings** → **Issues**. A
booking is always one advertiser buying one slot in one issue.

---

## 2. Signing in

One shared password, set when the app was deployed. Enter it and you're in for
**30 days** before it asks again.

If you follow a link while signed out, you'll land on the sign-in screen and be
taken to where you were heading once you're through.

**Sign out** is at the bottom of the sidebar.

To change the password, update `AUTH_PASSWORD` in Netlify and redeploy. Set
`AUTH_SECRET` too, if it isn't already — with it set, changing the password
doesn't sign you out of existing sessions.

---

## 3. The weekly rhythm

A typical week, and where each part lives:

| When | What you do | Where |
|---|---|---|
| Any time | Add prospects as you meet them | **Advertisers → New advertiser** |
| Early week | Pitch, move cards along the pipeline | **Advertisers → Pipeline** |
| On a yes | Create the booking, reserve the slot | **Bookings → New booking** |
| Mid week | Chase copy and creative from advertisers | **Issues → Publish checklist** |
| Before send | Build the newsletter from the checklist | **Issues → [issue] → Publish checklist** |
| After send | Mark bookings **Ran**, invoice them | **Bookings** |
| Ongoing | Chase the money | **Bookings → Unpaid** |
| Monthly | Check revenue and sell-through | **Dashboard** |

---

## 4. Advertisers

Every business you sell to, at any stage. **Advertisers** in the sidebar.

### Two views

**Table** — sortable, filterable list. Click any column header to sort; click
again to reverse. Filter by status or category, or search by name.

**Pipeline** — a Kanban board, one column per pipeline status. Drag a card to
another column to move it, or use the dropdown on the card (which also works by
keyboard). Each column header shows how many advertisers are in it and their
combined booked value.

### The pipeline statuses

| Status | Means |
|---|---|
| **Prospect** | On your list. Not yet approached. |
| **Pitched** | You've made contact and put a proposal to them. |
| **Won** | They've said yes but haven't run yet. |
| **Active** | Currently running ads. This is what "Active partners" counts on the dashboard. |
| **Paused** | Was active, has stopped for now. Worth coming back to. |
| **Lost** | Said no, or went quiet. Kept so you don't pitch them twice by accident. |

Nothing enforces the order — set whatever reflects reality.

### The fields

| Field | Notes |
|---|---|
| **Business name** | Required. |
| **Category** | Real Estate, Trades, Marine, Home & Lifestyle, Health & Services, Family, Retail (Large), Developer, Other. Drives the dashboard's revenue-by-category chart. |
| **Pipeline status** | As above. |
| **Contact name / Email / Phone** | Optional. Email and phone become clickable links on the detail page. |
| **Website** | Must start with `http://` or `https://`. |
| **Reviews checked** | A tick to record you've looked them up before pitching. Shows as a green tick in the table and a badge on their page. |
| **Last contacted** | So you can sort by who's gone cold. |
| **Notes** | Anything: what they want, who to talk to, what they've said no to. |

### The detail page

Contact details, a **totals** panel, and every booking they've ever had.

Totals are:

- **Booked** — everything they've committed to, cancelled bookings excluded
- **Paid** — what's actually landed
- **Outstanding** — booked minus paid, i.e. unpaid + invoiced
- **Bookings** — how many

**Delete** only works when they have no bookings. Move or delete those first —
this is deliberate, so you can't lose revenue history by deleting a business.

---

## 5. Issues

One row per newsletter send. **Issues** in the sidebar.

### Creating one

Pick the **publish date** and the title fills itself in as
`The Tide — 14 Aug 2025`. Overwrite it if you want something else — once you
type in the title, it stops auto-filling.

**Theme** is optional: what the issue is leading with. It shows on the issue
list and detail so you can tell issues apart at a glance.

### Issue statuses

| Status | Means |
|---|---|
| **Planning** | Exists so you can sell into it. Not being written yet. |
| **Drafting** | Being written. |
| **Ready** | Finished, not yet sent. |
| **Sent** | Gone out. |

These are for your own tracking — nothing behaves differently based on them.

### Two views

**Table** — every issue with sold/capacity and revenue. Oversold issues are
flagged in red.

**Calendar** — a month grid by publish date. Click any issue to open it. Navigate
months with the arrows, or **Today** to jump back.

### The issue detail page

This is where you run an issue. Three parts:

**Inventory panel** (left) — every slot group with `sold / capacity` and a state:

| State | Means |
|---|---|
| **OPEN** | Slots left |
| **FULL** | Exactly sold out |
| **⚠ OVERSOLD** | More sold than exist — needs fixing |

Below it, the **content-to-ad ratio** bar: total slots sold against a soft
target (10 by default). This is guidance toward the 3:1 content-to-ad goal and
**never blocks anything** — it turns amber past the target to tell you the issue
is getting ad-heavy.

**Bookings tab** — everything booked into this issue, including cancelled ones.

**Publish checklist tab** — your build sheet for send day. One card per live
booking (cancelled ones are hidden) with the ad type, the copy, the creative
thumbnail, and the CTA link. Each card is badged:

- **Copy + CTA ready** — has both, good to build
- **Needs assets** — missing copy or the CTA link, chase the advertiser

**Delete** only works on an issue with no bookings.

---

## 6. Bookings

One advertiser buying one slot in one issue. **Bookings** in the sidebar.

### The ad types

| Ad type | Slots per issue |
|---|---|
| **Headline** | 1 |
| **Feature** | 1 |
| **Bulletin – Classified** | shares 3 with Banner |
| **Bulletin – Banner** | shares 3 with Classified |
| **Bulletin Takeover** | 1 — takes all 3 bulletin slots |
| **Section Sponsor** | 1 per section |
| **Featured Event** | 1 |

**Sections** for a Section Sponsor: Weather, What's On, Gigs, Sports, Pet of the
Week, Digest. Each can have its own sponsor, so one issue can carry up to six.

### Creating a booking

**New booking**, or the button on an advertiser or issue page — which pre-selects
that advertiser or issue for you.

| Field | Notes |
|---|---|
| **Advertiser / Issue** | Both required. |
| **Ad type** | Choosing one pre-fills the price from your Settings defaults — until you type your own price, after which it stops changing. |
| **Section** | Only appears when the ad type is Section Sponsor. Required then. |
| **Price** | Whatever you actually agreed. |
| **Booking status / Payment** | See below. |
| **Label** | Leave blank and it generates one like `Example Realty – Headline – 14 Aug`. |
| **CTA URL** | Where the ad clicks through to. Needs `https://`. |
| **Ad copy** | The words that run in the newsletter. |
| **Internal notes** | Not for publication. |
| **Creative** | PNG, JPG, GIF, WEBP or SVG, up to 5MB. Preview appears immediately. |

As you pick the issue and ad type, the form checks inventory **live** and warns
you before you save if that slot is taken.

### Booking statuses

| Status | Means | Holds a slot? |
|---|---|---|
| **Reserved** | Verbally agreed, pencilled in | Yes |
| **Confirmed** | Locked in | Yes |
| **Ran** | Went out in the newsletter | Yes |
| **Cancelled** | Fell through | **No** — frees the slot |

A **Reserved** booking holds its slot. That's intentional: a pencilled-in
advertiser shouldn't have their slot sold from under them.

To free a slot while keeping the record, set it to **Cancelled** — don't delete.
Cancelled bookings stay visible on the issue, are excluded from every revenue
figure, and don't count against capacity.

### Payment statuses

| Status | Means |
|---|---|
| **Unpaid** | Nothing sent yet |
| **Invoiced** | Invoice out, money not in |
| **Paid** | Money received |

Both Unpaid and Invoiced count as **outstanding** on the dashboard and both
appear on the chase list.

### Three views

**Table** — everything, sortable and filterable by issue, ad type and payment
status.

**Calendar** — bookings by issue publish date, coloured by ad type. Click one to
edit it. Cancelled bookings show struck through.

**Unpaid** — the chase list. Everything still owing, cancelled excluded, oldest
issue first so the most overdue is at the top. This view has an **inline payment
dropdown** on each row, so you can work down the list marking things Invoiced and
Paid without opening anything.

### Deleting

**Delete** on a booking removes it *and* its uploaded creative, permanently. To
keep the record and free the slot, use **Cancelled** instead.

---

## 7. Inventory rules

The part that stops you selling the same slot twice.

### What's enforced

| Ad type | Rule |
|---|---|
| Headline | Max 1 per issue |
| Feature | Max 1 per issue |
| Featured Event | Max 1 per issue |
| Bulletin (Classified + Banner) | Max 3 per issue between them |
| Bulletin Takeover | Consumes all 3 — can't coexist with any other bulletin ad |
| Section Sponsor | Max 1 per issue **per section** |

Two different sections can each have a sponsor. Weather and Gigs on the same
issue is fine; two Weather sponsors is not.

### Blocked versus warned

This is the important distinction:

| You try to save as | Over capacity? | Result |
|---|---|---|
| **Confirmed** or **Ran** | Yes | **Blocked.** Won't save. Tells you what's in the way. |
| **Reserved** | Yes | **Saves**, warns you, and flags the issue as oversold |
| Anything | No | Saves normally |

The reasoning: confirming is a commitment, so the app won't let you make one it
knows you can't keep. Reserving is provisional — sometimes you genuinely want two
people pencilled in for one slot while you work out who's taking it. The issue
shows ⚠ OVERSOLD until you resolve it.

**Cancelled bookings never count**, so cancelling one immediately frees its slot.

### Total capacity

Each issue carries **12 slots**: Headline (1), Feature (1), Featured Event (1),
Bulletin (3), Section Sponsors (6). That's the denominator for sell-through.

---

## 8. Classifieds

The classifieds tab holds the short listings that run in the classifieds
section: a **headline**, **up to 70 words**, and a **contact number or email**.

They are deliberately separate from bookings. A booking is an advertiser buying
a slot; a classified is a listing someone sent in. Classifieds have no price, no
payment status and no advertiser record, and they don't consume any of the 12
slots in the inventory rules above.

### The fields

| Field | Notes |
|---|---|
| **Headline** | Required, up to 80 characters |
| **Listing copy** | Required. Up to 70 words, counted live as you type |
| **Category** | For sale, Wanted, Services, Jobs, Property, Community, Other |
| **Status** | Draft → Approved → Published, plus Archived |
| **Issue** | Optional — leave it unassigned to keep it in the queue |
| **Contact name** | Optional |
| **Email / Phone** | **At least one is required.** A listing nobody can reply to is not worth printing |
| **Notes** | Internal only, never printed |

### The word count

The counter under the copy box shows where you are as you type, and turns amber
once you're over 70. It counts words the way a reader would: "same-day" is one
word, a phone number's parts count, and a dash on its own doesn't.

**There is no minimum.** A listing that says what it needs to in ten words is
fine. The only limit is the 70-word cap, **flagged on drafts and enforced on
approval**, the same shape as the inventory rules — a reservation warns, a
confirmation blocks:

- **Draft** — save anything, any length. Copy arrives overwritten and gets cut
  down.
- **Approved** or **Published** — 70 words at most. Saving a longer listing is
  refused, and the message tells you how many words over you are.
- **Archived** — for listings that have run, or that you might run again. Delete
  removes the listing for good; archive keeps it.

If a listing was approved and later edited past the cap some other way, the list
flags it: the word count turns amber with a ⚠, and the number of listings over
the limit appears under the page title.

### Featuring a listing — $1.99

Any classified can be **featured**, the same way an event can: it runs with an
image above its copy and leads the classifieds block, for a flat **$1.99**.
(Featuring an *event* is **$4.99** — same upgrade, different product, priced
separately.) Plain listings are still free.

Tick **Featured listing** in the classified form and the image picker opens
underneath.

| Field | Notes |
|---|---|
| **Image** | Required once it's featured. PNG, JPG, GIF, WEBP or SVG, up to 5MB. Landscape reads best — it prints at the full width of the newsletter column, uncropped. |
| **Fee** | **Unpaid → Invoiced → Paid**, the same three states bookings use. New featured listings start Unpaid. |

Everything else works the way it does for events (see
[Featuring an event](#9-events)): picking a new image replaces the old one and
deletes the file it replaced, unticking **Featured** removes the image and
clears the fee, and the fee is snapshotted on the listing so a later price
change never rewrites what somebody was charged.

Under the page title you get **"N featured"** and **"$X to collect"**, both
links that filter the list; the **Featured** filter does the same from the
filter bar, with **Fee to collect** for the chase list. A featured listing
carries a star in the table with any uncollected fee under it, and **Export
CSV** gains `Featured`, `Fee`, `Fee paid` and `Image URL`.

Nothing in the app takes payment. Featuring is an invoice you send and mark off.

### Two views

- **Table** — the working list. Sort by headline, category, issue, word count or
  status; filter by any of them, including **Unassigned** to see the queue.
- **Copy** — every listing in full, in order, with its contact line. This is the
  view to work from on build day.

Search covers headlines, copy, contact names and emails.

### Putting them in the newsletter

**Export for beehiiv** downloads the **published** listings you're currently
looking at as an HTML file, ready to go into a post.

Two ways to use the file, whichever suits how you build:

1. **Open it in a browser**, select all, copy, and paste into the beehiiv
   editor. Headings, bold and the email links all come across.
2. **Or open it in a text editor** and paste the markup into a custom HTML
   block.

What comes out is styled to The Tide's brand guide: a Paper card, Deep Harbor
text, Steel Blue category eyebrows and links, and a Sea Glass rule under the
heading — the same system type the signup page uses, no web fonts. The card is
**600px wide at most** and framed with a border; on a narrower screen or column
it shrinks to fit rather than overflowing. Open the file and the page is just
the card — no empty space around it.

Inside it: a *Classifieds* heading, then the listings grouped under their
category (For sale, Wanted, Services…), each one a bold headline, the copy, and
the contact line with the email as a clickable link. Categories only appear when
there's more than one, so a run of three For sale listings doesn't get a
pointless header.

**Featured listings lead the block**, which is what the $1.99 buys, and they
bring their category heading up with them — a listing is never printed away from
the heading it belongs under. So a featured *Wanted* listing puts **Wanted**
first, itself at the top of it, and the other categories follow in their usual
order. Its image prints above its copy, full width of the column.

The export follows the filters, so **filter to an issue first** and you get
exactly that issue's listings, with the issue named under the heading.

It exports **Published only** — anything still Draft or Approved is left out, on
purpose, so nothing half-finished reaches a reader. Bear in mind listings are
usually sitting at *Approved* while you're building: mark them **Published**
before exporting. If none are, the export says so and tells you how many are
waiting at Approved.

### The public form

**Public form** in the top right opens **`/submit`** — your site's address with
`/submit` on the end. That's the page to send to customers. It's the one page in
the app that doesn't ask for the password, so the link can go in an email, a
newsletter footer or a social post.

It asks for exactly what a listing needs: headline, up to 70 words with the same
live counter you see, category, name, and an email or phone. The cap is
**enforced** there — a customer can't send you 200 words — and the submitter
picks no status and no issue.

It also offers **Feature my listing — $1.99**, with a photo picker underneath.
The form takes no payment and says so: it tells them you'll invoice once you've
confirmed the issue. A featured submission arrives with its photo attached and
its fee **Unpaid**.

What arrives:

- A **Draft**, **Unassigned**, tagged **Submitted** with a blue chip in the list.
- Nothing a customer sends appears in an issue until you approve it. Read it,
  trim it, assign an issue, set it to Approved.
- The count of listings waiting on you shows under the page title — **"3
  submitted, awaiting review"** — and clicking it filters to exactly those.
- The **Source** filter separates what you typed in from what came in.

Spam is handled quietly: a hidden field bots fill in and people never see, a
limit of five submissions from one place every ten minutes, and a check that the
form wasn't filled in impossibly fast. You don't have to do anything about it.

**Contact details are printed with the listing**, and the form says so above the
send button. That's how a classified works — readers reply to the person, not to
you — but it's worth knowing when someone asks.

---

## 9. Events

Community events — what's on, and when. **Events** in the sidebar.

An event is a classified with a date on it: same copy rules, same statuses
(Draft → Approved → Published, plus Archived), same two views. Everything in
section 8 applies. What follows is only what's different.

### When and where

| Field | Notes |
|---|---|
| **Starts** | Required — the date. |
| **Start time** | Optional. **Leave it blank for an all-day listing** and the event reads as a date instead of "12am". |
| **Ends** / **End time** | Only for events that run past one day, or where the finish is worth printing. |
| **Where** | Venue and suburb — what a reader needs to find it. |
| **Tickets / more info** | Optional link, printed with the listing. |

The dates come out as one line, in whichever shape fits:

- `Sat 15 Aug 2026` — no time given
- `Sat 15 Aug 2026, 10am` — a start time
- `Sat 15 Aug 2026, 10am – 2pm` — same day, both times
- `Sat 15 Aug 2026, 10am – Sun 16 Aug 2026, 4pm` — runs across days

### Featuring an event — $4.99

Any event listing can be **featured**: it runs with an image above its copy and
leads the What's On block, for a flat **$4.99**. It's the only paid extra on a
listing, and it's optional everywhere — plain listings are still free.

Tick **Featured event** in the event form and the image picker opens underneath.

| Field | Notes |
|---|---|
| **Image** | Required once it's featured. PNG, JPG, GIF, WEBP or SVG, up to 5MB. Landscape reads best — it prints at the full width of the newsletter column, uncropped. |
| **Fee** | **Unpaid → Invoiced → Paid**, the same three states bookings use. New featured listings start Unpaid. |

Picking a new image replaces the old one, and the file it replaced is deleted.
**Unticking Featured** removes the image and clears the fee — do that on a
listing somebody has already paid for and you're giving the money back, so
untick it only when the upgrade genuinely isn't running.

The fee is **snapshotted on the listing** when it's featured. If the price ever
changes, everything already sold keeps the price it was sold at.

Under the page title you get **"N featured"** and **"$X to collect"** — the
second is every featured listing not yet marked Paid, Invoiced included. Both
are links: they filter the list to exactly those. The **Featured** filter does
the same from the filter bar, with **Fee to collect** for the chase list. In the
table, a featured listing carries a star, and an uncollected fee sits under the
title in Ochre. **Export CSV** carries `Featured`, `Fee`, `Fee paid` and
`Image URL`, so a spreadsheet totals what's owed.

Nothing in the app takes payment. Featuring is an invoice you send and mark off,
the same as an ad booking.

> **Not the same as a Featured Event booking.** *Featured Event* in
> [Bookings](#6-bookings) is an ad slot sold to an advertiser out of the issue's
> inventory, at its own price. This is a $4.99 upgrade on a community listing:
> no advertiser, no inventory, no capacity check.

### The list is in date order

The page **opens sorted by date**, soonest first — that's the order you'd read
them in, and the order they'll run in. Click **When** to reverse it, or sort by
event, venue, category, word count or status like any other list.

Events that have been are **dimmed and marked "Been and gone"**. The **When**
filter cuts the list to **Upcoming** or **Past** in one click, and the count of
events still to come sits under the page title.

An event with no time stays "upcoming" for the whole of its day, so a Saturday
market doesn't vanish from the list at one minute past midnight on the morning
it runs.

### The public form

**Public form** in the top right opens **`/submit/event`** — the events version
of the classifieds form, and the page to send to anyone running something.

It asks for the event name, the date and an optional time, where it is, up to 70
words, a category, an optional tickets link, and a name plus an email or phone.
Two things it checks that the classifieds form doesn't: the date has to be
**still ahead of us**, and an end date can't come before the start.

It also offers **Feature my event — $4.99**, with a photo picker underneath. The
form takes no payment and says so: it tells them you'll invoice once you've
confirmed the issue. A featured submission arrives with its photo attached and
its fee **Unpaid**, waiting for you to invoice it.

Submissions arrive exactly like classifieds do — **Draft**, **Unassigned**,
tagged **Submitted** — with the count waiting on you under the page title and a
**Source** filter to separate them from what you typed in.

### Exporting

**Export CSV** carries both readable and machine-sortable dates: `Start date`
and `Start time` as plain `yyyy-MM-dd` and `HH:mm` columns for sorting in a
spreadsheet, plus a `When` column with the printed line.

**Export for beehiiv** gives you the published events as a *What's on* block,
**in date order**, each with its when-and-where line under the title. Unlike
classifieds they aren't grouped by category — a diary reads by date.

**Featured events lead the block**, ahead of the date order, which is what the
$4.99 buys: a reader meets the paid listing and its image first. Several
featured events keep their own date order among themselves, and everything
behind them is the diary exactly as it was.

A **featured** event carries its image into the block too, full width of the
column and above the copy. One thing to know: the image has to be at a public
web address for an inbox to load it, which it is on the live site. Running the
app locally, uploads are saved to a folder on your own machine instead, so those
images are left out of the export rather than pasted in broken.

Any event with a **Tickets / more info** link gets a **More info** button under
its copy — Sea Glass fill, Deep Harbor label, the same button the signup page
uses. It travels with the block whichever way you paste it, or you can copy just
the button across on its own. Events without a link simply don't get one.

If an event you're exporting has already been, the message says so and points
you at the Upcoming filter. It doesn't stop you: sometimes a recap is the point.

---

## 10. The dashboard

The home page. Everything respects the **period selector** at the top right:
**This month · This quarter · This year · All time**.

A booking counts in a period based on its **issue's publish date**, not when you
created it. An ad sold in June for a July issue is July revenue.

**Cancelled bookings are excluded everywhere on this page.**

### The six numbers

| Card | Exactly what it is |
|---|---|
| **Booked revenue** | Every booking in the period, added up |
| **Collected** | Of those, the ones marked Paid |
| **Outstanding** | Of those, the ones Unpaid or Invoiced |
| **Ads sold** | How many bookings, counted as bookings |
| **Sell-through** | Slots filled ÷ slots available across the period's issues |
| **Active partners** | Advertisers whose status is Active |

One subtlety on **Sell-through**: it counts *slots*, not bookings, because a
Bulletin Takeover is one booking that consumes three slots. That's why the card's
sublabel reads "X of Y slots" — so the number reconciles with the issue pages.

Every card links through to the matching filtered view.

### The charts

- **Revenue by issue** — each issue in the period, split collected versus
  outstanding
- **Revenue by ad type** — which formats actually earn
- **Revenue by advertiser category** — which sectors are carrying you

### The lists

- **Upcoming issues** — next six, with sold/capacity and an oversold flag
- **Chase list** — biggest unpaid bookings, with the total owed underneath
- **Pipeline** — how many advertisers sit at each stage

---

## 11. Reader survey

What readers told us they want. **Reader survey** in the sidebar. This is the
page to open before planning coverage, and the one to quote from when selling to
an advertiser who wants to know who reads you.

The data comes from the survey on the public site, which lives in its own
database. **The page re-reads it every time you open or refresh it** — there is
nothing to sync and no "last updated" to worry about beyond the timestamp in the
header.

### The six numbers

| Card | Exactly what it is |
|---|---|
| **Responses** | Completed surveys, all time |
| **Last 7 days** | How many came in this week — whether the survey is still working |
| **Top topic** | The most-picked topic, and the share who picked it |
| **Suburbs** | How many of the 20 coast suburbs are represented |
| **Kids at home** | Share answering "Yes", of those who answered that question |
| **Left an email** | How many are contactable for follow-up |

### The charts

- **Topics readers want covered** — the headline. This is the one that should
  shape what goes in the newsletter.
- **Responses per day** — is the survey still collecting, or has it gone quiet?
- **Suburb** and **Home ownership** — where your readers are, and whether they
  own or rent
- **Age, education, gender, relationship status, children, pets, hobbies,
  occupations** — the reader profile an advertiser asks for. Hobbies is the most
  directly sellable of these: it's what you point a golf club, a garden centre
  or a boat dealer at.
- **Household income, home value, investable assets** — the numbers a
  real-estate or financial-services advertiser wants

### Reading them honestly

Four things will trip you up if you don't know them:

1. **Each chart counts only the people who answered that question.** Every
   question except suburb and topics is optional, so the "6 answered · 2 skipped"
   line under each title is the real denominator. Two charts on this page can
   have different bases.
2. **Topics, pets and children's ages let people pick more than one**, so those
   percentages add up to more than 100%. That's not a bug. Hobbies is one choice
   each — anyone who picked "Other" typed their own answer, and those are listed
   as chips under the chart.
3. **Grey bars are "prefer not to say."** They're left in on purpose — hiding
   them would quietly inflate every other percentage.
4. **Small samples move fast.** Under 30 responses the page puts a note at the
   top. Quote the counts, not the percentages, until you're past that.

A chart that says "Nobody has answered this yet" means the question is optional
and everyone so far has skipped it — not that anything is broken.

A card showing **"asked since 5 Aug"** means that question was added to the
survey partway through. Every response collected before that date counts as a
skip, so ignore the big skipped number on those cards — it says nothing about
whether people are willing to answer.

If the page says the survey database isn't connected, that's a setup step, not a
fault: see the Reader survey section of `README.md`.

---

## 12. Settings

Three things, all optional to change.

**Bulletin slots per issue** (default 3) — how many bulletin ads an issue
carries. Changing this immediately changes what counts as full or oversold on
every issue, including past ones.

**Soft sold-out target** (default 10) — where the content-to-ad ratio bar hits
full. Guidance only; it never blocks a booking.

**Default prices** — pre-fills the booking form per ad type. Starting points, not
rules; any booking can be priced however you agreed.

| Ad type | Default |
|---|---|
| Headline | $450 |
| Feature | $300 |
| Bulletin – Classified | $80 |
| Bulletin – Banner | $120 |
| Bulletin Takeover | $300 |
| Section Sponsor | $150 |
| Featured Event | $100 |

Changing a default doesn't touch existing bookings.

---

## 13. Exporting to CSV

**Export CSV** on Advertisers, Bookings, Issues, Classifieds and Events, plus on each
issue's detail page for just that issue's bookings.

The export respects whatever you've filtered to. Filter to unpaid, export, and
you get exactly that list.

| Export | Columns |
|---|---|
| **Advertisers** | Name, Category, Status, Contact name, Email, Phone, Website, Reviews checked, Last contacted, Total booked, Total paid, Notes |
| **Bookings** | Label, Advertiser, Ad type, Section, Issue, Publish date, Price, Status, Paid, CTA URL, Copy, Notes |
| **Issues** | Title, Publish date, Status, Ads sold, Revenue, Theme |
| **Classifieds** | Headline, Copy, Words, Category, Status, Source, Issue, Publish date, Featured, Fee, Fee paid, Image URL, Contact name, Email, Phone, Notes |
| **Events** | Event, Start date, Start time, End date, End time, When, Where, Copy, Words, Category, Status, Source, Issue, Featured, Fee, Fee paid, Image URL, Tickets URL, Contact name, Email, Phone, Notes |

The Classifieds page also has **Export for beehiiv**, which is a different
thing: an HTML block of the published listings for pasting into a post, rather
than a spreadsheet. See [Classifieds](#8-classifieds).

Files open cleanly in Excel, Numbers and Google Sheets. These column sets mirror
the underlying data deliberately, so moving to a dedicated tool later loses
nothing.

---

## 14. Recipes

### Selling a new advertiser their first ad

1. **Advertisers → New advertiser.** Name, category, status **Prospect**. Tick
   *Reviews checked* once you've looked them up.
2. After pitching, move them to **Pitched** — drag the card on the Pipeline view.
3. On a yes, open them and hit **New booking**. Pick the issue and ad type, set
   the price, save as **Reserved**.
4. Move the advertiser to **Won**, then **Active** once the ad has run.
5. When the copy and creative arrive, open the booking, paste them in, upload the
   image, and set it to **Confirmed**.

### Building an issue

1. **Issues → New issue.** Set the publish date; the title fills itself in.
2. Sell into it. Watch the **inventory panel** as it fills.
3. Two days out, open **Publish checklist** and chase anything reading *Needs
   assets*.
4. On send day, work down the checklist — copy, creative, CTA for each ad.
5. After sending, set the issue to **Sent** and its bookings to **Ran**.

### Chasing money

1. **Bookings → Unpaid.** Oldest issue first, so the top is the most overdue.
2. Send invoices; flip each row's dropdown to **Invoiced** as you go.
3. As money lands, flip to **Paid** — the row drops off the list.
4. The dashboard's **Outstanding** should fall to match.

### Someone pulls out

Open the booking and set it to **Cancelled** — don't delete. The slot frees
immediately, the record survives, and the revenue drops out of every total. You
keep the history of who cancelled and when.

### Selling a takeover

Bulletin Takeovers need all three bulletin slots. If the issue already has any
bulletin booking, the app blocks it. Either cancel or move those first, or sell
the takeover into a different issue.

### Month-end

1. Dashboard → **This month**.
2. Read off booked, collected and outstanding.
3. **Bookings → Export CSV** for the accountant.
4. Check **Sell-through** — persistently low means you have inventory to sell;
   persistently near 100% means you can probably raise prices.

---

## 15. Troubleshooting

**"This issue already has a Headline booking"**
Working as intended — one Headline per issue. Cancel the existing one, pick a
different issue, or save as Reserved if you deliberately want both pencilled in.

**An issue shows ⚠ OVERSOLD**
More is booked than there are slots, from saving reservations over capacity.
Open the issue, look at which group is over, and cancel or move something.

**A creative won't upload**
Must be PNG, JPG, GIF, WEBP or SVG, and under 5MB. The error message says what
the actual problem was.

**The dashboard looks empty**
Check the period selector. It defaults to **This month** — if your issues are
next month, switch to **This quarter** or **All time**.

**Numbers look too low**
Cancelled bookings are excluded from every total everywhere. That's deliberate.

**Can't delete an advertiser or issue**
It still has bookings. Move or delete those first. This protects your revenue
history.

**Signed out unexpectedly**
Sessions last 30 days. They also end if the password was changed without
`AUTH_SECRET` set.

**A page shows an error**
Reload first. If it persists, the Netlify function logs have the real cause —
Netlify → Deploys → your deploy → Functions.

---

## 16. Limits and things to know

**One password, not accounts.** Everyone shares it, and the app can't tell who
did what. Fine for one operator; if more people need access, that's the point to
move to real accounts.

**No audit trail.** Nothing records who changed what. Deletes are permanent.

**Deleting a booking deletes its creative.** Cancel instead if you might want the
record.

**Prices are recorded, not calculated.** No GST handling, no discounts, no
invoicing. The app tracks what you agreed and whether it's been paid; the
invoice itself happens elsewhere.

**Dates are publish dates.** All revenue is attributed to when the ad runs, not
when it was sold or paid.

**Backups.** Everything lives in your Supabase project, which handles its own
backups. For your own copy, use the CSV exports — that's what they're for.

**Not indexed.** The app tells search engines to stay away and can't be framed by
another site. It's still reachable by anyone with the URL *and* the password, so
treat the password as the thing that matters.

---

*Ad manager for The Tide, a weekly local newsletter. Built to stay simple,
single-user, and export-friendly.*
