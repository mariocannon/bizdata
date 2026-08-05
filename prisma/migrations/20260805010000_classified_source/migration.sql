-- Where a classified came from. Existing rows were all typed in by the
-- operator, so STAFF is both the default and the correct backfill.
ALTER TABLE "Classified" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'STAFF';
