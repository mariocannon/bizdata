'use server'

import { revalidatePath } from 'next/cache'
import { saveSettings, settingsSchema } from '@/lib/settings'
import { AD_TYPES } from '@/lib/enums'
import { actionError, actionOk, checkbox, text, type ActionResult } from '@/lib/actions'

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

  const mediaKitPublished = checkbox(form, 'mediaKitPublished')
  const mediaKitSubscribers = Number(text(form, 'mediaKitSubscribers') || 0)
  const mediaKitOpenRate = Number(text(form, 'mediaKitOpenRate') || 0)
  const mediaKitContactEmail = text(form, 'mediaKitContactEmail')

  if (!Number.isInteger(mediaKitSubscribers) || mediaKitSubscribers < 0) {
    return actionError('Subscribers must be zero or more.', {
      mediaKitSubscribers: 'Enter a whole number',
    })
  }
  if (
    !Number.isInteger(mediaKitOpenRate) ||
    mediaKitOpenRate < 0 ||
    mediaKitOpenRate > 100
  ) {
    return actionError('The open rate is a percentage between 0 and 100.', {
      mediaKitOpenRate: 'Enter a whole percent, 0–100',
    })
  }
  // The kit is a public page with one action on it, so it can't go live
  // without somewhere for the reply to land.
  if (mediaKitPublished && mediaKitContactEmail === '') {
    return actionError('Add a contact email before publishing the media kit.', {
      mediaKitContactEmail: 'Required to publish',
    })
  }
  // Checked here as well as in the schema so a typo comes back as a field
  // error rather than as a thrown parse and a generic failure message.
  if (!settingsSchema.shape.mediaKitContactEmail.safeParse(mediaKitContactEmail).success) {
    return actionError('That contact email doesn’t look right.', {
      mediaKitContactEmail: 'Enter a valid email address',
    })
  }

  try {
    await saveSettings({
      bulletinCapacity,
      soldOutTarget,
      defaultPrices,
      mediaKitPublished,
      mediaKitSubscribers,
      mediaKitOpenRate,
      mediaKitContactEmail,
    })

    // Capacity feeds the inventory report, so every page that reads it refreshes.
    revalidatePath('/settings')
    revalidatePath('/issues')
    revalidatePath('/bookings')
    revalidatePath('/media-kit')
    revalidatePath('/')
    return actionOk(undefined, 'Settings saved.')
  } catch (error) {
    console.error('updateSettings failed', error)
    return actionError('Could not save settings. Please try again.')
  }
}
