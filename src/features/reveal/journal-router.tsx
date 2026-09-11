"use client"

import { useQuery } from "@tanstack/react-query"
import { Notebook } from "lucide-react"
import { useState } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { JournalScreen } from "@/features/reveal/journal-screen"
import { fetchFinishedSessions, fetchLiveSessions } from "@/features/session/api"
import { qk } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

/**
 * Picks which session the journal is about.
 *
 * Finished sessions first and pre-selected, because the post-mortem is what this screen is for. A
 * live session is listed too — journalling *during* a replay is the point of the terminal's panel,
 * and being able to read those notes back without ending the session is worth the row.
 */
export function JournalRouter() {
  const [selected, setSelected] = useState<string | null>(null)

  const { data: finished, isPending } = useQuery({
    queryKey: qk.finishedSessions(),
    queryFn: () => fetchFinishedSessions(),
  })
  const { data: live } = useQuery({ queryKey: qk.sessions(), queryFn: fetchLiveSessions })

  if (isPending) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-10 w-full rounded-sm" />
        <Skeleton className="h-64 w-full rounded-sm" />
      </div>
    )
  }

  const sessions = [...(finished ?? []), ...(live ?? [])]
  if (sessions.length === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card className="rounded-sm border-seam bg-panel">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Notebook className="size-6 text-muted-foreground" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-medium">No sessions yet</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Randomize a feed and trade it. The journal, the reveal and the post-mortem all attach to a session,
                and the reveal unlocks once you close one.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const current = selected ?? sessions[0].id

  return (
    <div className="space-y-4">
      {sessions.length > 1 ? (
        <div className="mx-auto flex max-w-4xl flex-wrap gap-1" role="group" aria-label="Session">
          {sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              aria-pressed={current === session.id}
              onClick={() => setSelected(session.id)}
              className={cn(
                "metric border px-2 py-1 text-xs transition-colors",
                current === session.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-seam text-muted-foreground hover:text-foreground",
              )}
            >
              {/* Identified by how far it got and its state — never by the feed, which is still
                  masked for every session on this list that has not been revealed. */}
              {session.barsScanned}/{session.totalBars} · {session.status}
            </button>
          ))}
        </div>
      ) : null}
      <JournalScreen key={current} sessionId={current} />
    </div>
  )
}
