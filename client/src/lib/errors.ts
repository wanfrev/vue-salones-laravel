export class AppError extends Error {
  code: string
  hint?: string

  constructor(message: string, code: string = 'UNKNOWN', hint?: string) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.hint = hint
  }
}

const DB_ERROR_MAP: Record<string, { message: string; hint?: string }> = {
  '23P01': {
    message: 'El empleado ya tiene una cita en ese horario.',
    hint: 'Selecciona otro horario o empleado.',
  },
  '23505': {
    message: 'Este registro ya existe.',
    hint: 'Verifica que los datos no estén duplicados.',
  },
  '23503': {
    message: 'No se puede eliminar porque tiene registros asociados.',
    hint: 'Elimina primero las referencias.',
  },
  '23502': {
    message: 'Faltan campos obligatorios.',
    hint: 'Completa todos los campos requeridos.',
  },
  '22P02': {
    message: 'Formato de datos inválido.',
    hint: 'Verifica que los valores tengan el formato correcto.',
  },
}

function extractDbError(error: unknown): { code: string; message: string; hint?: string } | null {
  if (!error || typeof error !== 'object') return null
  const err = error as Record<string, unknown>
  const code = String(err.code ?? '')
  if (code && DB_ERROR_MAP[code]) return { code, ...DB_ERROR_MAP[code] }
  return null
}

export async function resolveFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (!error || typeof error !== 'object') return fallback

  const maybeError = error as {
    message?: string
    name?: string
    context?: { json?: () => Promise<any>; text?: () => Promise<string> }
  }

  try {
    if (maybeError.context?.json) {
      const payload = await maybeError.context.json()
      if (payload?.error && typeof payload.error === 'string') return payload.error
      if (payload?.message && typeof payload.message === 'string') return payload.message
    }
  } catch {
    // body may have been consumed; try text instead
  }

  try {
    if (maybeError.context?.text) {
      const raw = await maybeError.context.text()
      if (raw?.trim()) {
        try {
          const parsed = JSON.parse(raw)
          if (parsed?.error && typeof parsed.error === 'string') return parsed.error
          if (parsed?.message && typeof parsed.message === 'string') return parsed.message
        } catch {
          // not JSON; use raw text
        }
        return raw
      }
    }
  } catch {
    // ignore
  }

  // The API client may set error.message to the raw JSON body string.
  // Try to extract meaningful message from it.
  if (maybeError.message && maybeError.message.trim()) {
    const msg = maybeError.message.trim()
    try {
      const parsed = JSON.parse(msg)
      if (parsed?.error && typeof parsed.error === 'string') return parsed.error
      if (parsed?.message && typeof parsed.message === 'string') return parsed.message
    } catch {
      // not JSON
    }
    // Filter out generic/garbage messages
    if (!/^(Failed to send a request to the Edge Function)$/i.test(msg)) {
      return msg
    }
  }

  return fallback
}

export function handleDbError(error: unknown, fallback: string): never {
  const mapped = extractDbError(error)
  if (mapped) {
    throw new AppError(mapped.message, mapped.code, mapped.hint)
  }
  if (error instanceof AppError) throw error
  if (error instanceof Error) throw new AppError(error.message)
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as Record<string, unknown>).message
    if (typeof msg === 'string' && msg.trim()) throw new AppError(msg.trim())
  }
  throw new AppError(fallback)
}

/**
 * Laravel's file-upload validation messages arrive in raw English (`apiUpload` just forwards
 * the JSON body's `message` field) — a non-technical user has no way to connect "The file field
 * must be a file of type: pdf, jpg..." to "my phone photo didn't save." These are the only
 * validation rules every upload endpoint in the app actually uses (see mimes:.../max:10240 on
 * EmployeeDocumentController, StaffingIncidentController, StaffingTaxEntryController,
 * StaffingAnnualTaxController), so pattern-matching them here covers every upload form at once.
 */
const FILE_VALIDATION_PATTERNS: [RegExp, string][] = [
  [/file field must be a file of type/i, 'Formato de archivo no soportado. Usa PDF, JPG, PNG, HEIC o WEBP.'],
  [/file field must not be greater than/i, 'El archivo es demasiado grande. El máximo permitido es 10 MB.'],
  [/file field is required/i, 'Debes seleccionar un archivo.'],
  [/file field must be a file/i, 'El archivo seleccionado no es válido.'],
]

function translateFileValidationMessage(msg: string): string | null {
  for (const [pattern, translated] of FILE_VALIDATION_PATTERNS) {
    if (pattern.test(msg)) return translated
  }
  return null
}

export function translateError(err: unknown, fallback?: string): string {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return 'La operación tardó demasiado. Verifica tu conexión a internet e intenta de nuevo.'
  }
  if (err instanceof AppError) return translateFileValidationMessage(err.message) ?? err.message
  if (err instanceof Error) {
    const msg = err.message || ''
    if (/timeout|timed out|aborted/i.test(msg)) {
      return 'La operación tardó demasiado. Verifica tu conexión a internet e intenta de nuevo.'
    }
    const translated = translateFileValidationMessage(msg)
    if (translated) return translated
    return msg || fallback || 'Error inesperado al procesar la solicitud.'
  }
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as Record<string, unknown>).message
    if (typeof msg === 'string' && msg.trim()) return translateFileValidationMessage(msg) ?? msg.trim()
  }
  return fallback || 'Error inesperado al procesar la solicitud.'
}
