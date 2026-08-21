import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, gateMode, verifySessionToken } from '@/lib/auth'

/**
 * The public forms and the endpoints they post to — a classified at /submit and
 * an event at /submit/event — plus the media kit at /media-kit, which is the
 * page an advertiser is sent and so has to open without a password. Everything
 * else in the app stays behind it.
 *
 * The media kit is the only public path that reads anything. It reads the
 * reader survey and the rate card, both server-side, and publishes neither raw:
 * every figure goes through `lib/media-kit.ts`, which bands and rounds it and
 * refuses to publish a question fewer than 30 people answered. Nothing
 * reader-identifying is in the shape it reads.
 */
const PUBLIC_PATHS = new Set([
  '/submit',
  '/api/classifieds/submit',
  '/submit/event',
  '/api/events/submit',
  '/media-kit',
])

/**
 * Gates the whole app behind the shared password. Server actions POST back to
 * the page they live on, so they pass through here too and are protected by the
 * same check — the only unauthenticated write paths are the two public forms
 * above, which are route handlers with their own validation and rate limits.
 */
export async function middleware(request: NextRequest) {
  const mode = gateMode()

  // Fail closed first, and for the public form too: a deploy that can't gate
  // itself shouldn't be taking writes from the internet either.
  if (mode === 'misconfigured') {
    return new NextResponse(
      'AUTH_PASSWORD is not set. Set it in your host\'s environment variables to open the app.',
      { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } }
    )
  }

  if (PUBLIC_PATHS.has(request.nextUrl.pathname)) {
    // A server action is dispatched by the ID in this header, not by the route
    // it was posted to — so an open route that accepts them is a doorway to
    // every action in the app, not just the ones on that page. Nothing public
    // uses actions, so refuse them here rather than rely on that staying true.
    if (request.headers.get('next-action')) {
      return new NextResponse('Not found', { status: 404 })
    }
    return NextResponse.next()
  }

  if (mode === 'disabled') return NextResponse.next()

  const authed = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (authed) return NextResponse.next()

  const login = new URL('/login', request.url)
  // Come back to whatever they were reaching for once they're in.
  const target = request.nextUrl.pathname + request.nextUrl.search
  if (target && target !== '/') login.searchParams.set('next', target)

  return NextResponse.redirect(login)
}

export const config = {
  matcher: [
    /*
     * Everything except:
     *   - /login (the gate itself)
     *   - Next.js internals and static assets
     *   - /brand (the logo and marks, which the public pages render)
     *   - /uploads (creative served from the local-disk driver)
     */
    '/((?!login|_next/static|_next/image|brand|uploads|favicon.ico).*)',
  ],
}
