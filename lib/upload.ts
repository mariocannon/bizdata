import 'server-only'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'

/**
 * The single seam between the app and file storage.
 *
 * Swap later: point this at S3 / Supabase Storage and return the public URL.
 * Nothing else in the app needs to change — callers only ever see the returned
 * string, which they store on `Booking.creativeUrl`.
 */

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')
const PUBLIC_PREFIX = '/uploads'
const MAX_BYTES = 5 * 1024 * 1024

const ALLOWED: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
}

export class UploadError extends Error {}

export async function saveFile(file: File): Promise<string> {
  if (file.size === 0) throw new UploadError('That file is empty.')
  if (file.size > MAX_BYTES) {
    throw new UploadError('Creative must be 5MB or smaller.')
  }

  const extension = ALLOWED[file.type]
  if (!extension) {
    throw new UploadError('Creative must be a PNG, JPG, GIF, WEBP or SVG image.')
  }

  await mkdir(UPLOAD_DIR, { recursive: true })

  // A generated name keeps the original filename out of the URL and removes
  // any chance of a path-traversal or collision.
  const filename = `${randomUUID()}${extension}`
  const bytes = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(UPLOAD_DIR, filename), bytes)

  return `${PUBLIC_PREFIX}/${filename}`
}

/** Removes a previously saved creative. Missing files are ignored. */
export async function deleteFile(url: string | null | undefined): Promise<void> {
  if (!url || !url.startsWith(`${PUBLIC_PREFIX}/`)) return

  const filename = path.basename(url)
  try {
    await unlink(path.join(UPLOAD_DIR, filename))
  } catch {
    // Already gone — nothing to clean up.
  }
}
