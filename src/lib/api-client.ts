import { camelize } from "@/lib/case"
import { ApiError, type Envelope } from "@/lib/envelope"

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<Envelope<T>> {
  if (!path.startsWith("/") || path.startsWith("//") || /^https?:/i.test(path)) {
    throw new Error("Browser API requests must use a same-origin path")
  }
  const response = await fetch(path, init)
  const envelope = camelize((await response.json()) as Envelope<T>)
  if (!response.ok || !envelope.success) {
    throw new ApiError(envelope, response.status)
  }
  return envelope
}

