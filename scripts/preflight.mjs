#!/usr/bin/env node
/**
 * Checks the deployment environment before the build touches the database.
 *
 * Prisma's own failure for a malformed connection string is P1013 — "the scheme
 * is not recognized" — which doesn't say which variable was wrong or why. This
 * names the variable and the mistake.
 *
 * Never prints a password or a key: connection strings are echoed back with the
 * credentials redacted.
 */

const isCI = Boolean(process.env.NETLIFY || process.env.CI)

const problems = []
const warnings = []

/** `postgresql://user:pw@host:5432/db` → `postgresql://user:***@host:5432/db` */
function redact(raw) {
  return raw.replace(/(:\/\/[^:/@]*:)[^@]*(@)/, '$1***$2')
}

function describeScheme(raw) {
  const match = raw.match(/^([a-zA-Z0-9+.-]*)(:\/\/)?/)
  return match?.[1] || '(none)'
}

function checkConnectionString(name, expectedPort, purpose) {
  const raw = process.env[name]

  if (!raw || raw.trim() === '') {
    problems.push(`${name} is not set. It is the ${purpose}.`)
    return
  }

  // Netlify stores the value literally, so anything wrapped or prefixed when it
  // was pasted is still there.
  if (raw !== raw.trim()) {
    problems.push(
      `${name} has leading or trailing whitespace. Re-paste it with no spaces or newlines.`
    )
    return
  }

  if (/^["']|["']$/.test(raw)) {
    problems.push(
      `${name} is wrapped in quotes. Netlify stores the value literally, so the quotes become part of the string — paste it without them.`
    )
    return
  }

  if (/^psql\s/i.test(raw)) {
    problems.push(
      `${name} starts with "psql ". Copy just the connection URI, not the whole shell command.`
    )
    return
  }

  if (!/^postgres(ql)?:\/\//.test(raw)) {
    const scheme = describeScheme(raw)
    const hint = /^https?$/i.test(scheme)
      ? ' That looks like the Supabase API URL — it belongs in SUPABASE_URL. The database string is under Settings → Database → Connection string.'
      : ''
    problems.push(
      `${name} must start with "postgresql://" but starts with "${scheme}".${hint}`
    )
    return
  }

  // Checked against the raw string: new URL() percent-encodes the brackets, so
  // a parsed password never contains them.
  if (/\[[^\]]*\]/.test(raw)) {
    problems.push(
      `${name} still contains a "[...]" placeholder. Replace it with the real database password.`
    )
    return
  }

  let url
  try {
    url = new URL(raw)
  } catch {
    problems.push(
      `${name} could not be parsed as a URL. If the database password contains @ : / ? # or %, each must be percent-encoded.`
    )
    return
  }

  if (!url.password) {
    warnings.push(`${name} has no password in it. Supabase connection strings normally do.`)
  }

  const port = url.port || '5432'
  if (port !== expectedPort) {
    warnings.push(
      `${name} uses port ${port}; the ${purpose} is normally port ${expectedPort}.`
    )
  }

  if (name === 'DATABASE_URL' && !raw.includes('pgbouncer=true')) {
    warnings.push(
      'DATABASE_URL has no ?pgbouncer=true&connection_limit=1. The app adds both at runtime, but set them on the variable so the configuration is explicit.'
    )
  }

  if (name === 'DIRECT_URL' && /^db\..*\.supabase\.co$/.test(url.hostname)) {
    warnings.push(
      'DIRECT_URL points at the direct database host, which is IPv6-only without the IPv4 add-on. Use the session pooler (…pooler.supabase.com:5432) instead.'
    )
  }

  console.log(`  ${name.padEnd(13)} ok  ${redact(raw)}`)
}

console.log('Preflight — checking deployment environment\n')

checkConnectionString('DATABASE_URL', '6543', 'pooled connection the app runs on')
checkConnectionString('DIRECT_URL', '5432', 'connection migrations run on')

if (!process.env.AUTH_PASSWORD) {
  problems.push(
    'AUTH_PASSWORD is not set. Without it the deployed app refuses every request, so this build would produce an unusable site.'
  )
} else {
  console.log('  AUTH_PASSWORD ok  (set)')
}

if (!process.env.AUTH_SECRET) {
  warnings.push(
    'AUTH_SECRET is not set. Sessions will be signed with the password instead, so changing the password signs everyone out.'
  )
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  warnings.push(
    'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not both set. Creative uploads will try to write to local disk, which does not persist on Netlify.'
  )
} else {
  console.log('  Supabase      ok  storage configured')
}

// Stripe is optional: unset means invoicing is simply off. But a key that is
// set and wrong is worth naming here rather than at the first invoice.
const stripeKey = process.env.STRIPE_SECRET_KEY?.trim()
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()

if (!stripeKey) {
  if (stripeWebhookSecret) {
    warnings.push(
      'STRIPE_WEBHOOK_SECRET is set but STRIPE_SECRET_KEY is not. Invoicing stays switched off.'
    )
  }
} else if (!/^(sk|rk)_(test|live)_/.test(stripeKey)) {
  problems.push(
    'STRIPE_SECRET_KEY does not look like a Stripe secret key (expected sk_test_…, sk_live_… or an rk_ restricted key). ' +
      'The publishable key pk_… is the wrong one — it cannot raise invoices.'
  )
} else {
  const live = stripeKey.startsWith('sk_live_') || stripeKey.startsWith('rk_live_')
  console.log(`  Stripe        ok  invoicing configured (${live ? 'LIVE' : 'test'} mode)`)

  if (!stripeWebhookSecret) {
    warnings.push(
      'STRIPE_WEBHOOK_SECRET is not set. Invoices can be raised and sent, but nothing will ever be marked paid — ' +
        'add the endpoint at Stripe → Developers → Webhooks (/api/stripe/webhook) and copy its signing secret.'
    )
  } else if (!stripeWebhookSecret.startsWith('whsec_')) {
    problems.push(
      'STRIPE_WEBHOOK_SECRET should start with "whsec_". Copy the signing secret from the webhook endpoint, not an API key.'
    )
  }

  if (live && !isCI) {
    warnings.push(
      'STRIPE_SECRET_KEY is a LIVE key in a local run. Invoices raised from here will charge real advertisers.'
    )
  }
}

if (warnings.length) {
  console.log('\nWarnings:')
  for (const warning of warnings) console.log(`  ! ${warning}`)
}

if (problems.length) {
  console.error('\nCannot build — fix these environment variables:\n')
  for (const problem of problems) console.error(`  ✗ ${problem}`)
  console.error(
    '\nNetlify: Site configuration → Environment variables.' +
      '\nSupabase: Settings → Database → Connection string (use the pooler for both).\n'
  )
  process.exit(1)
}

console.log(`\nPreflight passed.${isCI ? '' : ' (local)'}\n`)
