import type { Metadata } from "next"

import { PendingWorkspace } from "@/components/layout/pending-workspace"

export const metadata: Metadata = { title: "Trade Journal" }

export default function JournalPage() {
  return (
    <PendingWorkspace
      title="Trade Journal"
      summary="Candle-by-candle trade log, the post-session mystery reveal, and the psychology and discipline breakdown."
      sprint="Sprint 05"
      dependencies={["Replay session engine", "Execution simulator", "Reveal + discipline projector"]}
    />
  )
}
