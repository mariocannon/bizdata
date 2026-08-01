'use server'

import { revalidatePath } from 'next/cache'
import { saveSettings } from '@/lib/settings'
import { AD_TYPES } from '@/lib/enums'
import { actionError, actionOk, text, type ActionResult } from '@/lib/actions'

export async function updateSettings(form: FormData): Promise<ActionResult> {
  const defaultPrices: Record<string, number> = {}
  for (const adType of AD_TYPES) {
    const raw = text(form, `price.${adType}`)
    const value = Number(raw)
    if (!Number.isFinite(value) || value < 0) {
      return actionError('Prices must be zero or more.', {
        [`price.${adType}`]: 'Enter a number',
      })
    }
    defaultPrices[adType] = value
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
