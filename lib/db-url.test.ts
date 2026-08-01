import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { poolerSafeUrl, needsPoolerRepair } from './db-url'

const POOLER = 'postgresql://u:p@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres'
const SESSION = 'postgresql://u:p@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres'

describe('transaction pooler URLs', () => {
  it('adds both settings when neither is present', () => {
    const fixed = new URL(poolerSafeUrl(POOLER)!)
    assert.equal(fixed.searchParams.get('pgbouncer'), 'true')
    assert.equal(fixed.searchParams.get('connection_limit'), '1')
    assert.equal(needsPoolerRepair(POOLER), true)
  })

  it('leaves a correctly configured URL alone', () => {
    const already = `${POOLER}?pgbouncer=true&connection_limit=1`
    assert.equal(poolerSafeUrl(already), already)
    assert.equal(needsPoolerRepair(already), false)
  })

  it('keeps an explicit connection_limit the operator chose', () => {
    const fixed = new URL(poolerSafeUrl(`${POOLER}?connection_limit=5`)!)
    assert.equal(fixed.searchParams.get('connection_limit'), '5')
    assert.equal(fixed.searchParams.get('pgbouncer'), 'true')
  })

  it('does not override pgbouncer=false', () => {
    const fixed = new URL(poolerSafeUrl(`${POOLER}?pgbouncer=false`)!)
    assert.equal(fixed.searchParams.get('pgbouncer'), 'false')
  })

  it('preserves other query parameters', () => {
    const fixed = new URL(poolerSafeUrl(`${POOLER}?schema=public&sslmode=require`)!)
    assert.equal(fixed.searchParams.get('schema'), 'public')
    assert.equal(fixed.searchParams.get('sslmode'), 'require')
    assert.equal(fixed.searchParams.get('pgbouncer'), 'true')
  })
})

describe('everything else is left untouched', () => {
  it('ignores the session pooler, which keeps one backend per session', () => {
    assert.equal(poolerSafeUrl(SESSION), SESSION)
  })

  it('ignores a local database', () => {
    const local = 'postgresql://tide@localhost:5432/thetide?schema=public'
    assert.equal(poolerSafeUrl(local), local)
  })

  it('ignores a non-postgres URL', () => {
    assert.equal(poolerSafeUrl('mysql://u:p@host:6543/db'), 'mysql://u:p@host:6543/db')
  })

  it('passes an unparseable value through for Prisma to report', () => {
    assert.equal(poolerSafeUrl('not a url'), 'not a url')
  })

  it('handles undefined', () => {
    assert.equal(poolerSafeUrl(undefined), undefined)
    assert.equal(needsPoolerRepair(undefined), false)
  })
})
