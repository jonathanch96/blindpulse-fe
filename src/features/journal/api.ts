import type { EditJournalInput, WriteJournalInput } from "@/features/journal/schema"
import type { JournalEntry, JournalRevision } from "@/features/journal/types"
import { apiFetch } from "@/lib/api-client"
import { camelize } from "@/lib/case"
import { ApiError, type Envelope } from "@/lib/envelope"

export async function fetchJournal(sessionId: string): Promise<JournalEntry[]> {
  const envelope = await apiFetch<JournalEntry[]>(`/api/sessions/${encodeURIComponent(sessionId)}/journal`)
  return envelope.data ?? []
}

export async function writeJournalEntry(sessionId: string, input: WriteJournalInput): Promise<JournalEntry | null> {
  const envelope = await apiFetch<JournalEntry>(`/api/sessions/${encodeURIComponent(sessionId)}/journal`, {
    method: "POST",
    body: JSON.stringify(input),
  })
  return envelope.data
}

export async function editJournalEntry(
  sessionId: string,
  entryId: string,
  input: EditJournalInput,
): Promise<JournalEntry | null> {
  const envelope = await apiFetch<JournalEntry>(
    `/api/sessions/${encodeURIComponent(sessionId)}/journal/${encodeURIComponent(entryId)}`,
    { method: "PATCH", body: JSON.stringify(input) },
  )
  return envelope.data
}

export async function deleteJournalEntry(sessionId: string, entryId: string): Promise<void> {
  await apiFetch(`/api/sessions/${encodeURIComponent(sessionId)}/journal/${encodeURIComponent(entryId)}`, {
    method: "DELETE",
  })
}

// What the entry said before each edit. Shown on demand rather than inline: the current thesis is
// what the trader believes now, and the history is what they believed at the time — useful, and
// not the first thing to read.
export async function fetchJournalRevisions(sessionId: string, entryId: string): Promise<JournalRevision[]> {
  const envelope = await apiFetch<JournalRevision[]>(
    `/api/sessions/${encodeURIComponent(sessionId)}/journal/${encodeURIComponent(entryId)}/revisions`,
  )
  return envelope.data ?? []
}

/**
 * Attaches an image to an entry.
 *
 * A bare `fetch` rather than `apiFetch`, because that helper is JSON-only and a multipart body must
 * reach the BFF with its boundary intact. Notably the Content-Type is *not* set: the browser has to
 * generate it, because only the browser knows the boundary it just wrote.
 */
export async function attachJournalMedia(
  sessionId: string,
  entryId: string,
  file: File,
): Promise<JournalEntry | null> {
  const form = new FormData()
  form.append("file", file)
  const response = await fetch(
    `/api/sessions/${encodeURIComponent(sessionId)}/journal/${encodeURIComponent(entryId)}/media`,
    { method: "POST", body: form },
  )
  const envelope = camelize((await response.json()) as Envelope<JournalEntry>)
  if (!response.ok || !envelope.success) {
    throw new ApiError(envelope, response.status)
  }
  return envelope.data
}

/** What the server will accept. Stated here so the file picker offers only those. */
export const acceptedMediaTypes = "image/jpeg,image/png"
