"use client"

import { Lock } from "lucide-react"

import { difficultyCopy } from "@/features/feed/labels"
import type { Feed } from "@/features/feed/types"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Renders exactly the fields the API returns. There is no ticker line left blank and no date
// placeholder: the card cannot show what the type has no room for.
export function FeedCard({ feed, selected, onSelect }: { feed: Feed; selected?: boolean; onSelect?: (feed: Feed) => void }) {
  const copy = difficultyCopy[feed.difficulty]
  return (
    <button
      type="button"
      onClick={() => onSelect?.(feed)}
      aria-pressed={selected}
      className={cn(
        "flex w-full flex-col gap-3 border p-3 text-left transition-colors",
        selected ? "border-telemetry bg-panel-raised" : "border-seam bg-panel hover:bg-panel-raised",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Lock className="size-3.5 text-primary" aria-hidden="true" />
          <span className="metric text-sm font-semibold">{feed.alias}</span>
        </div>
        <Badge variant="outline" className="label-caps rounded-sm">
          {feed.timeframe}
        </Badge>
      </div>

      <p className="label-caps text-muted-foreground">{feed.assetClassHint}</p>

      <div className="flex items-center gap-2">
        <span
          className={cn(
            "label-caps rounded-sm border px-1.5 py-0.5",
            feed.difficulty === "crisis" && "border-bearish/40 bg-bearish-muted text-bearish",
            feed.difficulty === "volatile" && "border-bearish/30 text-bearish",
            feed.difficulty === "standard" && "border-seam-strong text-muted-foreground",
            feed.difficulty === "calm" && "border-bullish/40 text-bullish",
          )}
        >
          {copy.label}
        </span>
        {/* Counts, never dates. This is the whole session length expressed without a calendar. */}
        <span className="metric text-xs text-muted-foreground">{feed.tradeableBars} tradeable bars</span>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">{copy.blurb}</p>
    </button>
  )
}
