import 'server-only'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

/**
 * The single seam between the app and file storage.
 *
 * Two drivers, chosen by environment:
 *   - Supabase Storage when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
 *     (production — Netlify has no writable, persistent disk).
 *   - The local `public/uploads` folder otherwise, so a fresh clone still runs
 *     with no external services.
 *
 * Callers only ever see the returned string, which is stored on
 * `Booking.creativeUrl`. Adding a third driver means changing this file only.
 */

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')
const PUBLIC_PREFIX = '/uploads'
const MAX_BYTES = 5 * 1024 * 1024

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'creative'

const ALLOWED: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
}

export class UploadError extends Error {}

export function usingSupabaseStorage(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
}

function supabase() {
  // The service-role key never leaves the server — this module is server-only.
  return createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

function validate(file: File): string {
  if (file.size === 0) throw new UploadError('That file is empty.')
  if (file.size > MAX_BYTES) {
    throw new UploadError('Creative must be 5MB or smaller.')
  }

  const extension = ALLOWED[file.type]
  if (!extension) {
    throw new UploadError('Creative must be a PNG, JPG, GIF, WEBP or SVG image.')
  }
  return extension
}

export async function saveFile(file: File): Promise<string> {
  const extension = validate(file)

  // A generated name keeps the original filename out of the URL and removes
  // any chance of a path-traversal or collision.
  const filename = `${randomUUID()}${extension}`

  if (usingSupabaseStorage()) {
    const { error } = await supabase()
      .storage.from(SUPABASE_BUCKET)
      .upload(filename, await file.arrayBuffer(), {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error('supabase storage upload failed', error)
      // Surface what Supabase actually said. A generic message here sends you
      // hunting for the wrong problem: the common cause is the anon key in
      // SUPABASE_SERVICE_ROLE_KEY, which reads as a row-level-security denial,
      // not as anything to do with the bucket.
      const detail = error.message || 'no detail returned'
      const hint = /row-level security|Unauthorized|403|invalid|jwt/i.test(detail)
        ? ' This usually means SUPABASE_SERVICE_ROLE_KEY holds the anon/publishable key rather than the service_role key — only service_role may write to storage.'
        : /not found|404/i.test(detail)
          ? ` Check a bucket named "${SUPABASE_BUCKET}" exists (SUPABASE_STORAGE_BUCKET).`
          : ''

      throw new UploadError(`Storage upload failed: ${detail}.${hint}`)
    }

    const { data } = supabase().storage.from(SUPABASE_BUCKET).getPublicUrl(filename)
    return data.publicUrl
  }

  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(path.join(UPLOAD_DIR, filename), Buffer.from(await file.arrayBuffer()))
  return `${PUBLIC_PREFIX}/${filename}`
}

/** Removes a previously saved creative. Missing files are ignored. */
export async function deleteFile(url: string | null | undefined): Promise<void> {
  if (!url) return

  if (usingSupabaseStorage()) {
    // Only touch objects that live in our bucket.
    const marker = `/storage/v1/object/public/${SUPABASE_BUCKET}/`
    const index = url.indexOf(marker)
    if (index === -1) return

    const objectPath = url.slice(index + marker.length)
    const { error } = await supabase().storage.from(SUPABASE_BUCKET).remove([objectPath])
    if (error) console.error('supabase storage delete failed', error)
    return
  }

  if (!url.startsWith(`${PUBLIC_PREFIX}/`)) return

  try {
    await unlink(path.join(UPLOAD_DIR, path.basename(url)))
  } catch {
    // Already gone — nothing to clean up.
  }
}
