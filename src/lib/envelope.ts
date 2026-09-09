export type FieldError = {
  field: string
  rule: string
  message: string
}

export type Pagination = {
  page: number
  perPage: number
  totalItems: number
  totalPages: number
}

export type Envelope<T> = {
  success: boolean
  code: string
  message: string
  data: T | null
  meta: Record<string, unknown>
  errors: FieldError[]
  traceId: string
  timestamp: string
}

export class ApiError extends Error {
  constructor(
    public readonly envelope: Envelope<unknown>,
    public readonly status: number,
  ) {
    super(envelope.message)
    this.name = "ApiError"
  }
}

export function isSuccess<T>(envelope: Envelope<T>): envelope is Envelope<T> & { data: T } {
  return envelope.success && envelope.data !== null
}

export function unwrap<T>(envelope: Envelope<T>, status = 500): T {
  if (!isSuccess(envelope)) {
    throw new ApiError(envelope, status)
  }
  return envelope.data
}

// Prefers the specific field-level message (e.g. "Invalid email address") over the envelope's
// generic top-level message (e.g. "The request contains invalid fields"), and only falls back to
// a fixed string when the error isn't from the API at all.
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.envelope.errors[0]?.message ?? error.message
  return fallback
}

