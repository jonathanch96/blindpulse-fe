"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { Dices, RefreshCw } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { fetchFeeds, randomizeFeed } from "@/features/feed/api"
import { BlindingNotice } from "@/features/feed/components/blinding-notice"
import { FeedCard } from "@/features/feed/components/feed-card"
import { RandomizeDialog } from "@/features/feed/components/randomize-dialog"
import { difficultyCopy, difficultyOrder, timeframeOptions } from "@/features/feed/labels"
import type { Feed, FeedDifficulty, FeedFilter } from "@/features/feed/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { apiErrorMessage } from "@/lib/envelope"
import { qk } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

export function FeedsPage() {
  const [filter, setFilter] = useState<FeedFilter>({})
  const [selected, setSelected] = useState<Feed | null>(null)
  const [pending, setPending] = useState<Feed | null>(null)

  const { data: feeds, isPending, isError, refetch, isRefetching } = useQuery({
    queryKey: [...qk.feeds(), filter.difficulty ?? "any", filter.timeframe ?? "any"],
    queryFn: () => fetchFeeds(filter),
  })

  const randomize = useMutation({
    mutationFn: () => randomizeFeed(filter),
    onSuccess: (feed) => {
      if (!feed) {
        toast.error("No unseen feed matches this filter")
        return
      }
      setPending(feed)
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not pick a feed")),
  })

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Blinded Feeds</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Every feed is a real historical window with its identity removed. Pick one deliberately, or let the
            algorithm choose a window you have never traded.
          </p>
        </div>
        <Button className="gap-1.5 rounded-sm" onClick={() => randomize.mutate()} disabled={randomize.isPending}>
          <Dices className="size-4" aria-hidden="true" />
          {randomize.isPending ? "Selecting…" : "Randomize new starting point"}
        </Button>
      </header>

      <BlindingNotice />

      <div className="flex flex-wrap items-center gap-2">
        <FilterGroup
          label="Difficulty"
          value={filter.difficulty}
          options={difficultyOrder.map((value) => ({ value, label: difficultyCopy[value].label }))}
          onChange={(difficulty) => setFilter((current) => ({ ...current, difficulty: difficulty as FeedDifficulty | undefined }))}
        />
        <FilterGroup
          label="Timeframe"
          value={filter.timeframe}
          options={timeframeOptions.map((value) => ({ value, label: value }))}
          onChange={(timeframe) => setFilter((current) => ({ ...current, timeframe }))}
        />
        <Button
          variant="outline"
          size="sm"
          className="ml-auto h-7 gap-1.5 rounded-sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={cn("size-3.5", isRefetching && "animate-spin")} aria-hidden="true" />
          <span className="label-caps">Refresh</span>
        </Button>
      </div>

      {isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-40 rounded-sm" />
          ))}
        </div>
      ) : isError ? (
        <Card className="rounded-sm border-bearish/40 bg-bearish-muted">
          <CardContent className="py-6 text-sm text-bearish">
            Feeds could not be loaded. The API may be unreachable — retry once it is back.
          </CardContent>
        </Card>
      ) : feeds && feeds.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {feeds.map((feed) => (
            <FeedCard
              key={feed.id}
              feed={feed}
              selected={selected?.id === feed.id}
              onSelect={(picked) => {
                setSelected(picked)
                setPending(picked)
              }}
            />
          ))}
        </div>
      ) : (
        <Card className="rounded-sm border-seam bg-panel">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No published feeds match this filter yet.
          </CardContent>
        </Card>
      )}

      <RandomizeDialog feed={pending} onClose={() => setPending(null)} />
    </div>
  )
}

function FilterGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value?: string
  options: { value: string; label: string }[]
  onChange: (value: string | undefined) => void
}) {
  return (
    <div className="flex items-center gap-px border border-seam" role="group" aria-label={label}>
      <span className="label-caps bg-panel-raised px-2 py-1.5 text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={() => onChange(undefined)}
        aria-pressed={value === undefined}
        className={cn("metric px-2 py-1.5 text-xs", value === undefined ? "bg-telemetry text-telemetry-foreground" : "text-muted-foreground hover:text-foreground")}
      >
        Any
      </button>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "metric px-2 py-1.5 text-xs",
            value === option.value ? "bg-telemetry text-telemetry-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
