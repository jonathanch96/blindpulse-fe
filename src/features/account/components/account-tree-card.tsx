"use client"

import { useQuery } from "@tanstack/react-query"
import { ShieldAlert, ShieldCheck } from "lucide-react"

import { verifyLedger } from "@/features/account/api"
import { ResetAccountDialog } from "@/features/account/components/reset-account-dialog"
import type { Account, AccountTree } from "@/features/account/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatIterationLabel, formatMoney, formatPercent, formatSignedPercent, isNegative, shortHash } from "@/lib/format"
import { qk } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

export function AccountTreeCard({ tree }: { tree: AccountTree }) {
  const active = tree.iterations.find((iteration) => iteration.id === tree.activeAccountId)
  const headline = active ?? tree.iterations[tree.iterations.length - 1]
  if (!headline) return null

  return (
    <Card className="gap-0 overflow-hidden rounded-sm border-seam bg-panel p-0">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="metric flex size-9 items-center justify-center rounded-sm bg-primary text-sm font-semibold text-primary-foreground">
              {String(headline.iterationIndex).padStart(2, "0")}
            </span>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight">{headline.name}</h2>
                <StatusBadge account={headline} />
              </div>
              <p className="text-xs text-muted-foreground">
                {headline.strategyProfile ?? "No strategy profile recorded"} ·{" "}
                {tree.iterations.length} {tree.iterations.length === 1 ? "branch" : "branches"}
              </p>
            </div>
          </div>
          {active ? <ResetAccountDialog account={active} /> : null}
        </div>

        <dl className="grid grid-cols-2 gap-px overflow-hidden border border-seam bg-seam md:grid-cols-4">
          <Metric label="Starting equity" value={formatMoney(headline.initialBalance, headline.currency)} />
          <Metric
            label="Current balance"
            value={formatMoney(headline.currentEquity, headline.currency)}
            delta={formatSignedPercent(headline.netReturnPct)}
            negative={isNegative(headline.netReturnPct)}
          />
          <Metric label="Drawdown" value={formatPercent(headline.drawdownPct)} caption={`Gate ${formatPercent(headline.risk.maxDailyDrawdownPct)}`} />
          <Metric label="Minimum R:R" value={`1 : ${headline.risk.minRiskReward}`} caption={`${headline.risk.riskPerTradePct}% per trade`} />
        </dl>

        <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
          <IterationList tree={tree} />
          <IntegrityPanel accountId={headline.id} rootHash={headline.rootHash} />
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ account }: { account: Account }) {
  if (account.status === "active") {
    return <Badge className="rounded-sm bg-bullish-muted text-bullish label-caps">Active fork</Badge>
  }
  if (account.status === "reset") {
    return <Badge className="rounded-sm bg-bearish-muted text-bearish label-caps">Reset</Badge>
  }
  return <Badge variant="outline" className="rounded-sm label-caps">Archived</Badge>
}

function Metric({
  label,
  value,
  delta,
  caption,
  negative,
}: {
  label: string
  value: string
  delta?: string
  caption?: string
  negative?: boolean
}) {
  return (
    <div className="bg-panel-raised px-3 py-2.5">
      <dt className="label-caps text-muted-foreground">{label}</dt>
      <dd className="metric mt-1 text-[15px] font-semibold">{value}</dd>
      {delta ? (
        <p className={cn("metric text-xs", negative ? "text-bearish" : "text-bullish")}>{delta}</p>
      ) : caption ? (
        <p className="metric text-xs text-muted-foreground">{caption}</p>
      ) : null}
    </div>
  )
}

function IterationList({ tree }: { tree: AccountTree }) {
  // Newest first: the branch panel is read top-down as "where am I now, and what came before".
  const iterations = [...tree.iterations].reverse()
  return (
    <div className="border border-seam">
      <p className="label-caps border-b border-seam bg-panel-raised px-3 py-2 text-muted-foreground">
        Branch &amp; reset tree · {tree.iterations.length} nodes
      </p>
      <ul>
        {iterations.map((iteration) => (
          <li key={iteration.id} className="flex items-start gap-3 border-b border-seam px-3 py-2.5 last:border-b-0">
            <span
              className={cn(
                "mt-1.5 size-2 shrink-0 rounded-full",
                iteration.status === "active" ? "bg-bullish" : isNegative(iteration.netReturnPct) ? "bg-bearish" : "bg-muted-foreground",
              )}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px]">
                Iteration {formatIterationLabel(iteration.iterationIndex)}: {iteration.name}
              </p>
              <p className="metric text-xs text-muted-foreground">
                {formatMoney(iteration.initialBalance, iteration.currency)} →{" "}
                {formatMoney(iteration.currentEquity, iteration.currency)}
              </p>
              {iteration.resetReason ? (
                <p className="text-xs text-muted-foreground">Reset: {iteration.resetReason}</p>
              ) : null}
            </div>
            <span className={cn("metric text-xs", isNegative(iteration.netReturnPct) ? "text-bearish" : "text-bullish")}>
              {formatSignedPercent(iteration.netReturnPct)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// The integrity badge is a live recomputation of the ledger's hash chain, not a stored flag. A
// badge that only ever says VERIFIED because a column says so would be decoration.
function IntegrityPanel({ accountId, rootHash }: { accountId: string; rootHash: string | null }) {
  const { data, isPending } = useQuery({
    queryKey: qk.accountLedger(accountId),
    queryFn: () => verifyLedger(accountId),
  })

  const valid = data?.valid ?? null
  return (
    <div className="border border-seam bg-panel-raised p-3">
      <p className="label-caps text-muted-foreground">Cryptographic integrity</p>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Every reset seals the previous iteration under a chained hash. Trades are never overwritten or dropped.
      </p>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-seam pt-2.5">
        <span className="metric text-xs text-muted-foreground">
          {rootHash ? shortHash(rootHash) : data?.rootHash ? shortHash(data.rootHash) : "unsealed"}
        </span>
        {isPending ? (
          <span className="label-caps text-muted-foreground">Checking</span>
        ) : valid ? (
          <span className="label-caps flex items-center gap-1 text-bullish">
            <ShieldCheck className="size-3.5" aria-hidden="true" /> Verified
          </span>
        ) : (
          <span className="label-caps flex items-center gap-1 text-bearish">
            <ShieldAlert className="size-3.5" aria-hidden="true" /> Failed
          </span>
        )}
      </div>
    </div>
  )
}
