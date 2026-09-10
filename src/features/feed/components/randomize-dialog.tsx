"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Lock } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { fetchAccountTrees } from "@/features/account/api"
import { difficultyCopy } from "@/features/feed/labels"
import type { Feed, FeedDetail } from "@/features/feed/types"
import { startSession } from "@/features/session/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiErrorMessage } from "@/lib/envelope"
import { qk } from "@/lib/query-keys"

function isDetail(feed: Feed | FeedDetail): feed is FeedDetail {
  return "volatilityBand" in feed
}

// Starting a session is a commitment: it opens the account's next drawdown window and the feed
// cannot be swapped once trading begins. That is worth one confirm step, which is also the last
// honest moment to say what the trader is and is not being told.
export function RandomizeDialog({ feed, onClose }: { feed: Feed | FeedDetail | null; onClose: () => void }) {
  const open = feed !== null
  const router = useRouter()
  const queryClient = useQueryClient()

  // A session needs an account, because the account carries the risk policy the order gate will
  // enforce. Without one there is nothing to trade against, so the dialog says so rather than
  // failing at submit.
  const { data: trees } = useQuery({ queryKey: qk.accounts(), queryFn: fetchAccountTrees, enabled: open })
  const activeAccountId = trees?.find((tree) => tree.activeAccountId)?.activeAccountId ?? null

  const start = useMutation({
    mutationFn: () => startSession(activeAccountId!, feed!.id, feed!.timeframe),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.sessions() })
      onClose()
      router.push("/terminal")
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not start the session")),
  })

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

            {activeAccountId ? null : (
              <p className="border border-bearish/40 bg-bearish-muted px-3 py-2 text-xs text-bearish">
                You need an open replay portfolio first — the account carries the risk policy the order gate applies.
                Open one under Accounts &amp; Resets.
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" className="rounded-sm" onClick={onClose}>
                Not this one
              </Button>
              <Button
                className="rounded-sm"
                disabled={!activeAccountId || start.isPending}
                onClick={() => start.mutate()}
              >
                {start.isPending ? "Starting…" : "Start session"}
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
