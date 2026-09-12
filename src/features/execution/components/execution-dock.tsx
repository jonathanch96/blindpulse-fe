"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  amendTrade,
  cancelOrder,
  closeAllPositions,
  closePosition,
  fetchOrders,
  fetchPositions,
  fetchRisk,
  moveStopToBreakeven,
  placeOrder,
} from "@/features/execution/api"
import { OrderTicket } from "@/features/execution/components/order-ticket"
import { OrderList, PositionList } from "@/features/execution/components/position-list"
import { RiskPanel } from "@/features/execution/components/risk-panel"
import { rejectionReasons } from "@/features/execution/types"
import { ApiError, apiErrorMessage } from "@/lib/envelope"
import { qk } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

/**
 * The execution dock: risk, ticket, positions, orders.
 *
 * Everything the trader can do to their account lives in one column beside the chart, because the
 * decisions it takes are decisions about the chart. Ordering is by urgency rather than by workflow —
 * the risk readout is above the ticket because whether you *may* trade comes before what you would
 * trade, and a gate you have to scroll to is a gate you find out about afterwards.
 *
 * The cursor is the clock. Every advance can fill a resting order, trigger a stop and move the equity,
 * so a cursor change refetches all four queries rather than trusting anything cached: the server
 * resolved those bars and nothing here can derive what it decided. The dock watches the cursor itself
 * rather than being told by whatever moved it, because a caller that forgot would leave the trader
 * looking at positions from a bar ago with no sign that anything was stale.
 */
export function ExecutionDock({
  sessionId,
  lastPrice,
  closed,
  cursorIndex,
}: {
  sessionId: string
  lastPrice: string | null
  closed: boolean
  cursorIndex: number
}) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<"positions" | "orders">("positions")
  const [busyId, setBusyId] = useState<string | null>(null)

  const { data: risk } = useQuery({ queryKey: qk.sessionRisk(sessionId), queryFn: () => fetchRisk(sessionId) })
  const { data: positions } = useQuery({
    queryKey: qk.sessionPositions(sessionId),
    queryFn: () => fetchPositions(sessionId),
  })
  const { data: orders } = useQuery({ queryKey: qk.sessionOrders(sessionId), queryFn: () => fetchOrders(sessionId) })

  // One invalidation for the lot. An order fills, which opens a position, which commits margin, which
  // moves the allowance left — so refreshing any one of these alone leaves the dock internally
  // inconsistent, showing a position against a risk figure that predates it.
  const refreshAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: qk.sessionRisk(sessionId) }),
      queryClient.invalidateQueries({ queryKey: qk.sessionPositions(sessionId) }),
      queryClient.invalidateQueries({ queryKey: qk.sessionOrders(sessionId) }),
      queryClient.invalidateQueries({ queryKey: qk.sessionTrades(sessionId) }),
    ])
  }, [queryClient, sessionId])

  /**
   * Reports a refusal in the trader's terms.
   *
   * A gate refusal is not an error in the "something broke" sense — it is the account's own rules
   * working, and the most useful thing this product does. So it is surfaced as the specific rule that
   * bound, with the server's own message as the fallback, rather than a generic failure toast that
   * would make discipline look like a bug.
   */
  const reportRefusal = useCallback(async (error: unknown) => {
    const code = error instanceof ApiError ? error.envelope.code : undefined
    const known = code ? rejectionReasons[code] : undefined
    toast.error(known ?? apiErrorMessage(error, "The risk gate refused that order"))
    // A rejected order is still stored (BR-09), so the log has a new row to show even though nothing
    // was filled. Refreshing on failure is the point, not an afterthought.
    await refreshAll()
  }, [refreshAll])

  const place = useMutation({
    mutationFn: (submission: Parameters<typeof placeOrder>[1]) => placeOrder(sessionId, submission),
    onSuccess: async (order) => {
      await refreshAll()
      toast.success(
        order?.type === "market"
          ? "Order accepted. It fills on the next bar — the first price that exists after the decision."
          : "Resting order placed.",
      )
    },
    onError: reportRefusal,
  })

  const breakeven = useMutation({
    mutationFn: (tradeId: string) => moveStopToBreakeven(tradeId),
    onSuccess: async () => {
      await refreshAll()
      toast.success("Stop moved to entry. Your 1R is unchanged — it is measured from where you sized.")
    },
    onError: reportRefusal,
    onSettled: () => setBusyId(null),
  })

  const exit = useMutation({
    mutationFn: ({ tradeId, fraction }: { tradeId: string; fraction?: string }) =>
      closePosition(tradeId, fraction ? { fraction } : {}),
    onSuccess: async (closedPortion) => {
      await refreshAll()
      const pnl = closedPortion?.realizedPnl
      toast.success(pnl ? `Closed for ${pnl}` : "Position closed")
    },
    onError: reportRefusal,
    onSettled: () => setBusyId(null),
  })

  const amend = useMutation({
    mutationFn: ({ tradeId, levels }: { tradeId: string; levels: { stopLoss?: string; takeProfit?: string } }) =>
      amendTrade(tradeId, levels),
    onSuccess: async () => {
      await refreshAll()
      toast.success("Levels moved")
    },
    onError: reportRefusal,
    onSettled: () => setBusyId(null),
  })

  const cancel = useMutation({
    mutationFn: (orderId: string) => cancelOrder(orderId),
    onSuccess: async () => {
      await refreshAll()
      toast.success("Order cancelled")
    },
    onError: reportRefusal,
    onSettled: () => setBusyId(null),
  })

  const flatten = useMutation({
    mutationFn: () => closeAllPositions(sessionId),
    onSuccess: async (count) => {
      await refreshAll()
      toast.success(count === 0 ? "Nothing was open" : `Flattened ${count} position${count === 1 ? "" : "s"}`)
    },
    onError: reportRefusal,
  })

  // The refetch on every cursor move. Depending on cursorIndex rather than on a callback means any
  // path that advances the replay — the step key, the transport bar, the playback clock driving it
  // from the server — lands here identically.
  useEffect(() => {
    void refreshAll()
  }, [cursorIndex, refreshAll])

  const openCount = positions?.length ?? 0

  return (
    <div className="flex h-full min-h-0 flex-col" aria-label="Execution">
      <RiskPanel risk={risk} />

      {closed ? (
        <p className="border-b border-seam px-3 py-2 text-[11px] text-muted-foreground">
          This session has ended. The record stands as it is — the reveal is in the Trade Journal.
        </p>
      ) : (
        <OrderTicket
          lastPrice={lastPrice}
          risk={risk}
          disabled={closed}
          pending={place.isPending}
          onSubmit={(submission) =>
            place.mutate({
              // A fresh key per submission, not per session: it is what makes a retried submit a
              // no-op rather than a second position, and reusing one would make the second *intended*
              // order a duplicate.
              clientKey: crypto.randomUUID(),
              ...submission,
            })
          }
        />
      )}

      <div className="flex items-center gap-px border-b border-seam px-3 py-1.5">
        {(["positions", "orders"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            aria-pressed={tab === value}
            className={cn(
              "label-caps px-2 py-0.5",
              tab === value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {value === "positions" ? `Positions${openCount ? ` · ${openCount}` : ""}` : "Orders"}
          </button>
        ))}
        {tab === "positions" && openCount > 0 && !closed ? (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto h-6 rounded-sm px-2"
            disabled={flatten.isPending}
            onClick={() => flatten.mutate()}
          >
            <span className="label-caps">Flatten all</span>
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "positions" ? (
          <PositionList
            positions={positions ?? []}
            busyTradeId={busyId}
            disabled={closed}
            onBreakeven={(tradeId) => {
              setBusyId(tradeId)
              breakeven.mutate(tradeId)
            }}
            onClose={(tradeId, fraction) => {
              setBusyId(tradeId)
              exit.mutate({ tradeId, fraction })
            }}
            onAmend={(tradeId, levels) => {
              setBusyId(tradeId)
              amend.mutate({ tradeId, levels })
            }}
          />
        ) : (
          <OrderList
            orders={orders ?? []}
            busyOrderId={busyId}
            disabled={closed}
            onCancel={(orderId) => {
              setBusyId(orderId)
              cancel.mutate(orderId)
            }}
          />
        )}
      </div>

      {/* The cursor index is rendered so the dock and the chart visibly agree on which bar the
          trader is acting from. A dock that disagreed with the chart about that would be worse than
          one that showed nothing. */}
      <p className="border-t border-seam px-3 py-1 text-[10px] text-muted-foreground">
        Acting from bar {cursorIndex + 1}
      </p>
    </div>
  )
}
