-- Adds the public-submission workflow to DirectoryListing: PENDING/PUBLISHED
-- status, STAFF/PUBLIC source, and the contact details a public submitter
-- leaves so the operator can follow up. Column for column this mirrors
-- 20260805010000_classified_source / 20260806010000_event_source and the
-- contact columns on Classified/Event, deliberately, so the shape stays
-- familiar even though the workflow itself is simpler (no issue lifecycle,
-- no REJECTED/ARCHIVED — see prisma/schema.prisma).
--
-- Existing rows were all typed in by the operator and are already live, so
-- 'PUBLISHED' and 'STAFF' are both the default and the correct backfill —
-- this migration changes no existing row's behaviour.
ALTER TABLE "DirectoryListing" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE "DirectoryListing" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'STAFF';
ALTER TABLE "DirectoryListing" ADD COLUMN "contactName" TEXT;
ALTER TABLE "DirectoryListing" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "DirectoryListing" ADD COLUMN "contactPhone" TEXT;

-- CreateIndex
CREATE INDEX "DirectoryListing_status_idx" ON "DirectoryListing"("status");
