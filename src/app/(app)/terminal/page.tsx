import type { Metadata } from "next"

import { ReplayTerminal } from "@/features/replay/replay-terminal"

export const metadata: Metadata = { title: "Replay Terminal" }

export default function TerminalPage() {
  return <ReplayTerminal />
}
