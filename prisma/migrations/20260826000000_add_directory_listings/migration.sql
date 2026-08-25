-- CreateTable
CREATE TABLE "DirectoryListing" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "blurb" TEXT NOT NULL,
    "phone" TEXT,
    "url" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectoryListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DirectoryListing_category_idx" ON "DirectoryListing"("category");

-- Row-level security, for the reasons set out in
-- 20260801050000_enable_row_level_security.
ALTER TABLE "DirectoryListing" ENABLE ROW LEVEL SECURITY;
