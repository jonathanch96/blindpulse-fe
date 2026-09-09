"use client"

import { useQuery } from "@tanstack/react-query"
import { GitBranch, ShieldCheck } from "lucide-react"

import { fetchAccountTrees } from "@/features/account/api"
import { AccountTreeCard } from "@/features/account/components/account-tree-card"
import { OpenAccountDialog } from "@/features/account/components/open-account-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { qk } from "@/lib/query-keys"

export function AccountsPage() {
  const { data: trees, isPending, isError } = useQuery({ queryKey: qk.accounts(), queryFn: fetchAccountTrees })

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Account Hierarchy &amp; Replay Portfolios</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Preserve immutable trading journals across resets. Branch, fork, or wipe balances without corrupting
            historical statistical integrity.
          </p>
        </div>
        <OpenAccountDialog />
      </header>

      {isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full rounded-sm" />
          <Skeleton className="h-40 w-full rounded-sm" />
        </div>
      ) : isError ? (
        <Card className="rounded-sm border-bearish/40 bg-bearish-muted">
          <CardContent className="py-6 text-sm text-bearish">
            Accounts could not be loaded. The API may be unreachable — reload once it is back.
          </CardContent>
        </Card>
      ) : trees && trees.length > 0 ? (
        <div className="space-y-4">
          {trees.map((tree) => (
            <AccountTreeCard key={tree.rootAccountId} tree={tree} />
          ))}
        </div>
      ) : (
        <Card className="rounded-sm border-seam bg-panel">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <GitBranch className="size-6 text-muted-foreground" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-medium">No replay portfolios yet</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Open one to start a reset tree. Every later reset forks a new iteration beside it — nothing you trade
                here is ever overwritten or deleted.
              </p>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Each iteration is sealed with a hash-chained ledger.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
