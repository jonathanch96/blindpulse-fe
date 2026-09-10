import type { Metadata } from "next"

import { FeedsPage } from "@/features/feed/feeds-page"

export const metadata: Metadata = { title: "Blinded Feeds" }

export default function Feeds() {
  return <FeedsPage />
}
