-- Featured events: the optional paid upgrade on an event listing. The listing
-- runs with an image above its copy for a flat fee.
--
-- Existing rows are all plain listings, so `false` is both the default and the
-- correct backfill, and their fee is genuinely zero.
ALTER TABLE "Event" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;

-- The uploaded image, as returned by lib/upload.ts — a Supabase Storage URL in
-- production, a /uploads path on local disk otherwise.
ALTER TABLE "Event" ADD COLUMN "imageUrl" TEXT;

-- What was charged, snapshotted when the upgrade was taken. Reading the current
-- price at display time would silently rewrite old invoices.
ALTER TABLE "Event" ADD COLUMN "featuredFee" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- PaidStatus union — UNPAID, INVOICED, PAID. Same three states the bookings
-- chase list uses, so the fee is chased the same way.
ALTER TABLE "Event" ADD COLUMN "featuredPaid" TEXT NOT NULL DEFAULT 'UNPAID';
