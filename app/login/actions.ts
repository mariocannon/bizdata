'use server'

import { cookies } from 'next/headers'
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  passwordMatches,
} from '@/lib/auth'
import { actionError, actionOk, text, type ActionResult } from '@/lib/actions'

export async function signIn(form: FormData): Promise<ActionResult> {
  const password = text(form, 'password')

  if (!password) {
    return actionError('Enter the password.')
  }

  if (!(await passwordMatches(password))) {
    // Deliberately vague, and no hint about whether a password is even set.
    return actionError('That password is not right.')
  }

  cookies().set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })

  return actionOk(undefined, 'Welcome back.')
}

export async function signOut(): Promise<ActionResult> {
  cookies().delete(SESSION_COOKIE)
  return actionOk(undefined, 'Signed out.')
}
