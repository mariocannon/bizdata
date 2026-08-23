import { cache } from 'react'

/**
 * Per-request memoisation for server-side loaders.
 *
 * `React.cache` deduplicates a call within a single render, which is what makes
 * it safe for a loader that several components (or a page and a helper) each
 * ask for independently — the second caller gets the first one's promise
 * instead of a second database round trip. It is *not* a cross-request cache:
 * every request starts empty, so a `force-dynamic` page stays as fresh as it
 * was before.
 *
 * It only exists in React's server build, though. The rule tests import these
 * modules straight into Node, where `cache` comes back undefined — so fall back
 * to calling through untouched rather than making the modules untestable.
 */
const maybeCache: unknown = cache

export const requestCache: typeof cache =
  typeof maybeCache === 'function' ? cache : (fn) => fn as never
