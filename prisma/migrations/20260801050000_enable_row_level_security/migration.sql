-- Supabase auto-exposes every table in the `public` schema through PostgREST,
-- reachable with the anon key — which is public by design and ships in client
-- bundles. Without row-level security, that would make advertiser contact
-- details and revenue readable by anyone holding the project URL.
--
-- Enabling RLS with no policies denies PostgREST's `anon` and `authenticated`
-- roles entirely. The app is unaffected: Prisma connects as the role that owns
-- these tables, and in Postgres a table owner bypasses RLS unless the table is
-- switched to FORCE ROW LEVEL SECURITY, which it deliberately is not.
--
-- This app authenticates in middleware, not through Supabase Auth, so there is
-- no legitimate PostgREST caller to write a policy for.

ALTER TABLE "Advertiser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Issue"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Booking"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Settings"   ENABLE ROW LEVEL SECURITY;
