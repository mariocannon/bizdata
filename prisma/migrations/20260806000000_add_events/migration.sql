-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "ticketUrl" TEXT,
    "issueId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_issueId_idx" ON "Event"("issueId");

-- CreateIndex
-- Every list and the export are ordered by date.
CREATE INDEX "Event_startsAt_idx" ON "Event"("startsAt");

-- AddForeignKey
-- SET NULL to match Classified: deleting an issue returns its events to the
-- queue rather than blocking, which is right for a listing.
ALTER TABLE "Event" ADD CONSTRAINT "Event_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Row-level security, for the reasons set out in
-- 20260801050000_enable_row_level_security.
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
