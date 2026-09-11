import type { Disclosure, Reveal } from "@/features/reveal/types"
import { apiFetch } from "@/lib/api-client"

// Returns null when the session has not been revealed. The server answers REVEAL_LOCKED with a 403,
// which is a real answer rather than an error — the session exists and is the trader's; the curtain
// has not gone up — so it is translated here instead of being thrown at a screen that has a perfectly
// good pre-reveal state to render.
export async function fetchReveal(sessionId: string): Promise<Reveal | null> {
  try {
    const envelope = await apiFetch<Reveal>(`/api/sessions/${encodeURIComponent(sessionId)}/reveal`)
    return envelope.data
  } catch (error) {
    if (isLocked(error)) return null
    throw error
  }
}

export async function revealSession(sessionId: string): Promise<Reveal | null> {
  const envelope = await apiFetch<Reveal>(`/api/sessions/${encodeURIComponent(sessionId)}/reveal`, { method: "POST" })
  return envelope.data
}

export async function fetchDisclosure(sessionId: string): Promise<Disclosure | null> {
  try {
    const envelope = await apiFetch<Disclosure>(`/api/sessions/${encodeURIComponent(sessionId)}/reveal/bars`)
    return envelope.data
  } catch (error) {
    if (isLocked(error)) return null
    throw error
  }
}

function isLocked(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "envelope" in error &&
    (error as { envelope: { code?: string } }).envelope?.code === "REVEAL_LOCKED"
  )
}
