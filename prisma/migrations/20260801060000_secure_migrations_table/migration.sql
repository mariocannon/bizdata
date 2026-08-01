-- Prisma's own bookkeeping table is created by the CLI, not by our schema, so
-- it was left outside the earlier RLS migration. PostgREST exposes it like any
-- other table in `public`: with RLS off, anyone holding the anon key could read
-- the migration history and — worse — modify or delete rows, which is how
-- Prisma decides what has already been applied. A tampered row can make a
-- later deploy re-run or refuse a migration.
--
-- No business data lives here, so this is lower severity than the other four
-- tables, but there is no reason to leave it reachable.
--
-- Prisma is unaffected: it connects as the table owner, and a Postgres owner
-- bypasses RLS unless the table is switched to FORCE ROW LEVEL SECURITY.

ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
