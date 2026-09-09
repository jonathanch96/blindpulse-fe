import type { Metadata } from "next"

import { PendingWorkspace } from "@/components/layout/pending-workspace"

export const metadata: Metadata = { title: "Performance Analytics" }

export default function AnalyticsPage() {
  return (
    <PendingWorkspace
      title="Performance Analytics"
      summary="Cross-session expectancy, R-multiple distribution, streak dispersion, rule adherence, and asset-class split — all aggregated only after each session is revealed."
      sprint="Sprint 06"
      dependencies={["Analytics projector", "Session metrics stream"]}
    />
  )
}
