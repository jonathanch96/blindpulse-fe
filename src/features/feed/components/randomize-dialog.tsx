"use client"

import { Lock } from "lucide-react"

import { difficultyCopy } from "@/features/feed/labels"
import type { Feed, FeedDetail } from "@/features/feed/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

function isDetail(feed: Feed | FeedDetail): feed is FeedDetail {
  return "volatilityBand" in feed
}

// Starting a session is a commitment: it opens the account's next drawdown window and the feed
// cannot be swapped once trading begins. That is worth one confirm step, which is also the last
// honest moment to say what the trader is and is not being told.
export function RandomizeDialog({ feed, onClose }: { feed: Feed | FeedDetail | null; onClose: () => void }) {
  const open = feed !== null
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent className="rounded-md sm:max-w-md">
        {feed ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="size-4 text-primary" aria-hidden="true" />
                <span className="metric">{feed.alias}</span>
              </DialogTitle>
              <DialogDescription>
                {feed.assetClassHint} · {feed.timeframe} · {feed.tradeableBars} tradeable bars after a{" "}
                {feed.warmupBars}-bar lookback.
              </DialogDescription>
            </DialogHeader>

            <dl className="grid grid-cols-2 gap-px border border-seam bg-seam">
              <Readout label="Difficulty" value={difficultyCopy[feed.difficulty].label} />
              <Readout label="Session length" value={`${feed.totalBars} bars`} />
              {isDetail(feed) ? (
                <>
                  <Readout label="Volatility" value={feed.volatilityBand} />
                  <Readout label="Structure" value={feed.structureBand} />
                </>
              ) : null}
            </dl>

            <p className="text-xs leading-relaxed text-muted-foreground">
              {difficultyCopy[feed.difficulty].blurb}
            </p>

            {/* Sprint 03 turns this into POST /sessions. Until the engine exists, say so in words
                rather than shipping a button that looks live and does nothing — a dead control is
                worse than an absent one, because the trader blames themselves for it. */}
            <p className="border border-seam bg-panel-raised px-3 py-2 text-xs text-muted-foreground">
              The replay engine lands in Sprint 03. This feed is ready for it; sessions cannot be started yet.
            </p>

            <DialogFooter>
              <Button variant="outline" className="rounded-sm" onClick={onClose}>
                Close
              </Button>
              <Button className="rounded-sm opacity-50" disabled aria-disabled="true">
                Start session
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel-raised px-3 py-2">
      <dt className="label-caps text-muted-foreground">{label}</dt>
      <dd className="metric mt-0.5 text-sm capitalize">{value}</dd>
    </div>
  )
}
