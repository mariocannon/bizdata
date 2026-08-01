import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, gateMode, verifySessionToken } from '@/lib/auth'

/**
 * Gates the whole app behind the shared password. Server actions POST back to
 * the page they live on, so they pass through here too and are protected by the
 * same check — there is no unauthenticated write path.
 */
export async function middleware(request: NextRequest) {
  const mode = gateMode()

  if (mode === 'disabled') return NextResponse.next()

  if (mode === 'misconfigured') {
    // Fail closed: a production deploy without AUTH_PASSWORD serves nothing.
    return new NextResponse(
      'AUTH_PASSWORD is not set. Set it in your host\'s environment variables to open the app.',
      { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } }
    )
  }

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
     *   - /uploads (creative served from the local-disk driver)
     *   - /api/stripe/webhook — Stripe can't hold a session cookie, so this one
     *     route authenticates by verifying the Stripe signature on the request
     *     instead. It is exempt from the password, NOT from authentication:
     *     the route rejects anything it can't verify. Nothing else under /api
     *     is exempt, and no other route should be added here without its own
     *     equivalent check.
     */
    '/((?!login|_next/static|_next/image|uploads|api/stripe/webhook|favicon.ico).*)',
  ],
}
