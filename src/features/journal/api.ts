import type { EditJournalInput, WriteJournalInput } from "@/features/journal/schema"
import type { JournalEntry, JournalRevision } from "@/features/journal/types"
import { apiFetch } from "@/lib/api-client"

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
