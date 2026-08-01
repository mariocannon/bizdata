/**
 * Single shared password for the whole app (spec §14).
 *
 * Runs in middleware on the Edge runtime as well as in server actions, so
 * everything here uses Web Crypto and no Node-only APIs.
 *
 * Behaviour:
 *   - AUTH_PASSWORD set        → the gate is on.
 *   - Not set, development     → the gate is off, so a fresh clone just runs.
 *   - Not set, production      → fail closed. Never serve real advertiser data
 *                                to an unauthenticated visitor by accident.
 */

export const SESSION_COOKIE = 'tide_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export type GateMode = 'enabled' | 'disabled' | 'misconfigured'

export function gateMode(): GateMode {
  if (process.env.AUTH_PASSWORD) return 'enabled'
  return process.env.NODE_ENV === 'production' ? 'misconfigured' : 'disabled'
}

function encoder() {
  return new TextEncoder()
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

/** Constant-time comparison — never leak how much of a secret matched. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

/**
 * The signing key. Falls back to the password itself so a deploy that sets only
 * AUTH_PASSWORD still gets signed cookies — setting AUTH_SECRET as well means
 * rotating the password doesn't have to invalidate every session, and vice
 * versa.
 */
function signingSecret(): string {
  return process.env.AUTH_SECRET || process.env.AUTH_PASSWORD || 'insecure-dev-secret'
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder().encode(signingSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

async function sign(payload: string): Promise<string> {
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(), encoder().encode(payload))
  return toBase64Url(new Uint8Array(signature))
}

/** Issues a signed session token that expires on its own. */
export async function createSessionToken(now = Date.now()): Promise<string> {
  const payload = toBase64Url(
    encoder().encode(JSON.stringify({ exp: now + SESSION_MAX_AGE * 1000 }))
  )
  return `${payload}.${await sign(payload)}`
}

export async function verifySessionToken(
  token: string | undefined,
  now = Date.now()
): Promise<boolean> {
  if (!token) return false

  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false

  const expected = await sign(payload)
  if (!timingSafeEqual(fromBase64Url(signature), fromBase64Url(expected))) return false

  try {
    const { exp } = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)))
    return typeof exp === 'number' && exp > now
  } catch {
    return false
  }
}

/** Checks a submitted password against AUTH_PASSWORD in constant time. */
export async function passwordMatches(submitted: string): Promise<boolean> {
  const expected = process.env.AUTH_PASSWORD
  if (!expected) return false

  // Comparing HMACs rather than raw strings keeps the comparison constant-time
  // even though the two values differ in length.
  const key = await hmacKey()
  const [a, b] = await Promise.all([
    crypto.subtle.sign('HMAC', key, encoder().encode(submitted)),
    crypto.subtle.sign('HMAC', key, encoder().encode(expected)),
  ])

  return timingSafeEqual(new Uint8Array(a), new Uint8Array(b))
}
