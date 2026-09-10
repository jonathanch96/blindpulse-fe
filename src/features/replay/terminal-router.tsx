"use client"

import { useQuery } from "@tanstack/react-query"

import { fetchLiveSessions } from "@/features/session/api"
import { SessionTerminal } from "@/features/session/session-terminal"
import { ReplayTerminal } from "@/features/replay/replay-terminal"
import { Skeleton } from "@/components/ui/skeleton"
import { qk } from "@/lib/query-keys"

// The terminal shows whatever live session the trader has, and its resting state otherwise. There
// is deliberately no session id in the URL: an account can only have one live session, so the
// server already knows which one is meant, and a URL that could name a different one would be a
// way to open two cursors on the same equity.
export function TerminalRouter() {
  const { data: sessions, isPending } = useQuery({ queryKey: qk.sessions(), queryFn: fetchLiveSessions })

  if (isPending) {
    return (
      <div className="space-y-px p-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }
  const live = sessions?.[0]
  return live ? <SessionTerminal sessionId={live.id} /> : <ReplayTerminal />
}
