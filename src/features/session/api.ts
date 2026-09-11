import { apiFetch } from "@/lib/api-client"
import type { ReplaySession, SessionBars } from "@/features/session/types"

export async function startSession(accountId: string, feedId: string, timeframe?: string): Promise<ReplaySession | null> {
  const envelope = await apiFetch<ReplaySession>("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ accountId, feedId, timeframe }),
  })
  return envelope.data
}

export async function fetchLiveSessions(): Promise<ReplaySession[]> {
  const envelope = await apiFetch<ReplaySession[]>("/api/sessions")
  return envelope.data ?? []
}

export async function fetchSession(id: string): Promise<ReplaySession | null> {
  const envelope = await apiFetch<ReplaySession>(`/api/sessions/${encodeURIComponent(id)}`)
  return envelope.data
}

// Asks for the session's current timeframe rolled up to the revealed edge. The server decides how
// far that is; the client passes no bound of its own, so there is nothing here to get wrong.
export async function fetchSessionView(id: string, timeframe?: string): Promise<SessionBars | null> {
  const query = timeframe ? `?timeframe=${encodeURIComponent(timeframe)}` : "?view=true"
  const envelope = await apiFetch<SessionBars>(`/api/sessions/${encodeURIComponent(id)}/bars${query}`)
  return envelope.data
}

export type StreamTicket = { ticket: string; url: string; expiresInSeconds: number }

// Tickets are single-use and short-lived, so this is called once per connection attempt rather
// than cached. The URL comes back resolved by the BFF: the browser never builds it.
export async function fetchStreamTicket(id: string): Promise<StreamTicket | null> {
  const envelope = await apiFetch<StreamTicket>(`/api/sessions/${encodeURIComponent(id)}/stream-ticket`, {
    method: "POST",
  })
  return envelope.data
}

async function command(id: string, action: string, body?: unknown): Promise<ReplaySession | null> {
  const envelope = await apiFetch<ReplaySession>(`/api/sessions/${encodeURIComponent(id)}/${action}`, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return envelope.data
}

export const stepSession = (id: string, count: number) => command(id, "step", { count })
export const setSessionSpeed = (id: string, speed: string) => command(id, "speed", { speed })
export const setSessionTimeframe = (id: string, timeframe: string) => command(id, "timeframe", { timeframe })
export const pauseSession = (id: string) => command(id, "pause")
export const resumeSession = (id: string) => command(id, "resume")
export const closeSession = (id: string) => command(id, "close")
