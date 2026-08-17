-- The featured upgrade, now on classifieds as well as events: an image above
-- the copy and the top of the exported block, for the same flat fee.
--
-- Column for column this is 20260816000000_featured_events applied to the other
-- listing table, deliberately — the two are the same product on different
-- shapes of listing, and one lib/featured.ts prices and chases both.
--
-- Existing rows are all plain listings, so `false` is both the default and the
-- correct backfill, and their fee is genuinely zero.
ALTER TABLE "Classified" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;

-- The uploaded image, as returned by lib/upload.ts — a Supabase Storage URL in
-- production, a /uploads path on local disk otherwise.
ALTER TABLE "Classified" ADD COLUMN "imageUrl" TEXT;

-- What was charged, snapshotted when the upgrade was taken. Reading the current
-- price at display time would silently rewrite old invoices.
ALTER TABLE "Classified" ADD COLUMN "featuredFee" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- PaidStatus union — UNPAID, INVOICED, PAID.
ALTER TABLE "Classified" ADD COLUMN "featuredPaid" TEXT NOT NULL DEFAULT 'UNPAID';
