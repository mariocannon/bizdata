'use server'

import { revalidatePath } from 'next/cache'
import { saveSettings } from '@/lib/settings'
import { parseDollarsToCents } from '@/lib/money'
import { AD_TYPES } from '@/lib/enums'
import { actionError, actionOk, text, type ActionResult } from '@/lib/actions'

export async function updateSettings(form: FormData): Promise<ActionResult> {
  // The form shows dollars; settings store integer cents like every other price.
  const defaultPrices: Record<string, number> = {}
  for (const adType of AD_TYPES) {
    const cents = parseDollarsToCents(text(form, `price.${adType}`))
    if (cents === null || cents < 0) {
      return actionError('Prices must be zero or more.', {
        [`price.${adType}`]: 'Enter a number',
      })
    }
    defaultPrices[adType] = cents
  }

  const bulletinCapacity = Number(text(form, 'bulletinCapacity'))
  const soldOutTarget = Number(text(form, 'soldOutTarget'))

  if (!Number.isInteger(bulletinCapacity) || bulletinCapacity < 1) {
    return actionError('Bulletin capacity must be at least 1.', {
      bulletinCapacity: 'Enter a whole number of 1 or more',
    })
  }
  if (!Number.isInteger(soldOutTarget) || soldOutTarget < 1) {
    return actionError('The sold-out target must be at least 1.', {
      soldOutTarget: 'Enter a whole number of 1 or more',
    })
  }

  try {
    await saveSettings({ bulletinCapacity, soldOutTarget, defaultPrices })

    // Capacity feeds the inventory report, so every page that reads it refreshes.
    revalidatePath('/settings')
    revalidatePath('/issues')
    revalidatePath('/bookings')
    revalidatePath('/')
    return actionOk(undefined, 'Settings saved.')
  } catch (error) {
    console.error('updateSettings failed', error)
    return actionError('Could not save settings. Please try again.')
  }
}
