-- Issues are listed, sorted and joined in publish-date order everywhere in the
-- app — the dashboard, the issues table, the calendar and the bookings list all
-- order by it — so the column earns an index.
CREATE INDEX "Issue_publishDate_idx" ON "Issue"("publishDate");
