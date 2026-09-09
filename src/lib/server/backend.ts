import "server-only"

import type { Envelope } from "@/lib/envelope"

export type BackendInit = Omit<RequestInit, "headers"> & {
  headers?: HeadersInit
  requestId?: string
  accessToken?: string
}

export type BackendResult<T> = {
  envelope: Envelope<T>
  status: number
}

function backendBaseUrl(): string {
  const value = process.env.BACKEND_BASE_URL
  if (!value) {
    throw new Error("BACKEND_BASE_URL is required")
  }
  return value.replace(/\/$/, "")
}

export async function backendFetch<T>(path: string, init: BackendInit = {}): Promise<BackendResult<T>> {
  if (!path.startsWith("/")) {
    throw new Error("Backend paths must start with /")
  }
  const headers = new Headers(init.headers)
  headers.set("X-Request-ID", init.requestId ?? crypto.randomUUID())
  if (init.body !== undefined && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }
  if (init.accessToken) {
    headers.set("Authorization", `Bearer ${init.accessToken}`)
  }
  const url = `${backendBaseUrl()}/api/v1${path}`
  const response = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  })
  // Read as text first: a non-JSON or malformed body (a proxy/health-check page in front of the
  // backend, a partial response, HTML from an unexpected redirect) should surface what actually
  // came back instead of an opaque "Unexpected token" thrown from deep inside response.json().
  const raw = await response.text()
  let envelope: Envelope<T>
  try {
    envelope = JSON.parse(raw) as Envelope<T>
  } catch (cause) {
    const snippet = raw.length > 500 ? `${raw.slice(0, 500)}…` : raw
    throw new Error(
      `Backend response was not valid JSON — ${init.method ?? "GET"} ${url} returned ${response.status}: ${snippet}`,
      { cause },
    )
  }
  return { envelope, status: response.status }
}
