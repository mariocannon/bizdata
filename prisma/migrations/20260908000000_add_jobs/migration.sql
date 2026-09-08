-- Adds the "Hibiscus Coast Jobs" board: one paid job listing per row.
--
-- Column for column this is 20260805000000_add_classifieds with a hire on it —
-- same DRAFT lifecycle, same optional issueId back to Issue with the same
-- SET NULL, same contact columns, same RLS-on-no-policy stance. What is new:
--
--   employer / jobType / town / pay / applyUrl   the hire itself
--   closesAt                                      the 30-day run; NOT NULL,
--                                                 always set by the app
--                                                 (lib/jobs.ts defaultClosesAt)
--   tier / price / paid                           the base listing is *paid*,
--                                                 so it carries one tier, one
--                                                 snapshotted price and the
--                                                 same three-state chase a
--                                                 Booking uses — not
--                                                 Classified's separate
--                                                 featured-fee track
--   logoUrl                                       the FEATURED tier's upgrade,
--                                                 as Classified.imageUrl is the
--                                                 featured classified's
--
-- The PostgREST side — the anon SELECT policy thetidelanding's build reads
-- through, and the anon INSERT policy the public "post a role" form writes
-- through — lives in thetidelanding/supabase/newsletter-ads/migrations, the
-- same split every other public-facing table on this project follows.

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "employer" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "pay" TEXT,
    "applyUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "source" TEXT NOT NULL DEFAULT 'STAFF',
    "tier" TEXT NOT NULL DEFAULT 'STANDARD',
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paid" TEXT NOT NULL DEFAULT 'UNPAID',
    "logoUrl" TEXT,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "issueId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Job_issueId_idx" ON "Job"("issueId");

-- CreateIndex
-- The "awaiting review" queue and thetidelanding's build query filter on this.
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
-- Every list, the export and the public page order by it.
CREATE INDEX "Job_closesAt_idx" ON "Job"("closesAt");

-- AddForeignKey
-- SET NULL, same as Classified: a listing outlives the issue it was slotted
-- into and returns to the unplaced queue.
ALTER TABLE "Job" ADD CONSTRAINT "Job_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Row-level security, for the reasons set out in
-- 20260801050000_enable_row_level_security: this table holds contact details
-- and Supabase exposes every public table through PostgREST. The policies that
-- open specific doors for the anon key live in thetidelanding's
-- supabase/newsletter-ads/migrations.
ALTER TABLE "Job" ENABLE ROW LEVEL SECURITY;
