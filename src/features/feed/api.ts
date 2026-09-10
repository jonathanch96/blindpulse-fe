import { apiFetch } from "@/lib/api-client"
import type { Feed, FeedBars, FeedDetail, FeedFilter } from "@/features/feed/types"

function query(filter: FeedFilter): string {
  const params = new URLSearchParams()
  if (filter.difficulty) params.set("difficulty", filter.difficulty)
  if (filter.timeframe) params.set("timeframe", filter.timeframe)
  const encoded = params.toString()
  return encoded ? `?${encoded}` : ""
}

export async function fetchFeeds(filter: FeedFilter = {}): Promise<Feed[]> {
  const envelope = await apiFetch<Feed[]>(`/api/feeds${query(filter)}`)
  return envelope.data ?? []
}

export async function fetchFeed(id: string): Promise<FeedDetail | null> {
  const envelope = await apiFetch<FeedDetail>(`/api/feeds/${encodeURIComponent(id)}`)
  return envelope.data
}

// Picks a feed the trader has never traded. The exclusion happens server-side: handing back a
// window whose ending they already know would reintroduce exactly the hindsight this removes.
export async function randomizeFeed(filter: FeedFilter = {}): Promise<FeedDetail | null> {
  const envelope = await apiFetch<FeedDetail>(`/api/feeds/random${query(filter)}`, { method: "POST" })
  return envelope.data
}

export async function fetchFeedBars(id: string, from: number, to: number): Promise<FeedBars | null> {
  const envelope = await apiFetch<FeedBars>(
    `/api/feeds/${encodeURIComponent(id)}/bars?from=${from}&to=${to}`,
  )
  return envelope.data
}
