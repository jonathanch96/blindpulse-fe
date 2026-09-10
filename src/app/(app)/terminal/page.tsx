import type { Metadata } from "next"

import { TerminalRouter } from "@/features/replay/terminal-router"

export const metadata: Metadata = { title: "Replay Terminal" }

export default function TerminalPage() {
  return <TerminalRouter />
}
