-- The media kit at /media-kit is a public page, so it ships switched off:
-- mediaKitPublished stays false until the operator has filled the numbers in
-- and chosen to open it.
--
-- Subscribers and open rate are typed by the operator rather than derived —
-- the list lives in beehiiv, not in this database, so there is nothing here to
-- count.
ALTER TABLE "Settings" ADD COLUMN "mediaKitPublished"    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Settings" ADD COLUMN "mediaKitSubscribers"  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Settings" ADD COLUMN "mediaKitOpenRate"     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Settings" ADD COLUMN "mediaKitContactEmail" TEXT;
