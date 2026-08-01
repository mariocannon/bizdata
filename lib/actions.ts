/** Shared result shape for every server action, so forms handle them alike. */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; message: string; errors?: Record<string, string> }

export function actionError(
  message: string,
  errors?: Record<string, string>
): ActionResult<never> {
  return { ok: false, message, errors }
}

export function actionOk<T>(data?: T, message?: string): ActionResult<T> {
  return { ok: true, data, message }
}

/** Reads a FormData field as a trimmed string. */
export function text(form: FormData, key: string): string {
  const value = form.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

/** Reads a checkbox field. */
export function checkbox(form: FormData, key: string): boolean {
  const value = form.get(key)
  return value === 'on' || value === 'true' || value === '1'
}

/** Reads an optional string, mapping '' to undefined. */
export function optional(form: FormData, key: string): string | undefined {
  const value = text(form, key)
  return value === '' ? undefined : value
}

/** Reads an uploaded file, ignoring the empty file browsers send for no selection. */
export function file(form: FormData, key: string): File | null {
  const value = form.get(key)
  if (value instanceof File && value.size > 0) return value
  return null
}
