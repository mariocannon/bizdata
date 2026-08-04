import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * The reader-survey database.
 *
 * This is a *different* Supabase project from the one the ad manager runs on:
 * the app's own data lives in Postgres behind Prisma (DATABASE_URL), and
 * SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY point at the storage bucket that
 * holds ad creative. The survey is collected by the public newsletter site into
 * its own project, so it gets its own connection and its own env vars.
 *
 * Why the service-role key and not the anon key: `survey_responses` has RLS on
 * with an INSERT-only policy for `anon` — the public site can post a response
 * but nobody can read one back. That is the right shape for a table holding
 * reader demographics, and it means the anon key returns zero rows here. The
 * service-role key reads it server-side only; this module is `server-only`, so
 * the key can never be bundled into client JavaScript.
 */

const SURVEY_URL = process.env.SURVEY_SUPABASE_URL
const SURVEY_SERVICE_ROLE_KEY = process.env.SURVEY_SUPABASE_SERVICE_ROLE_KEY

export function surveyConfigured(): boolean {
  return Boolean(SURVEY_URL && SURVEY_SERVICE_ROLE_KEY)
}

export function surveyClient(): SupabaseClient {
  if (!surveyConfigured()) {
    throw new Error(
      'Survey database is not configured. Set SURVEY_SUPABASE_URL and SURVEY_SUPABASE_SERVICE_ROLE_KEY.'
    )
  }

  return createClient(SURVEY_URL!, SURVEY_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // Every read has to be live. Next.js patches global fetch and caches it by
      // default, which would pin the first response for the life of the build —
      // opting out here is what makes a browser refresh actually re-query.
      fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
    },
  })
}
