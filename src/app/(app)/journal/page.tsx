import type { Metadata } from "next"

import { JournalRouter } from "@/features/reveal/journal-router"

export const metadata: Metadata = { title: "Trade Journal" }

export default function JournalPage() {
  return <JournalRouter />
}
