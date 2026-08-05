-- CreateTable
CREATE TABLE "Classified" (
    "id" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "issueId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Classified_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Classified_issueId_idx" ON "Classified"("issueId");

-- AddForeignKey
-- SET NULL rather than RESTRICT: a classified outlives the issue it was slotted
-- into and returns to the unplaced queue, whereas a booking is the sale itself
-- and must block the delete.
ALTER TABLE "Classified" ADD CONSTRAINT "Classified_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Row-level security, for the reasons set out in
-- 20260801050000_enable_row_level_security: this table holds contact details
-- and Supabase exposes every public table through PostgREST.
ALTER TABLE "Classified" ENABLE ROW LEVEL SECURITY;
