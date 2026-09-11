"use client"

import { useQuery } from "@tanstack/react-query"
import { Gauge, Lock, Notebook, ReceiptText } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchJournal } from "@/features/journal/api"
import { emotionLabels } from "@/features/journal/types"
import { fetchReveal } from "@/features/reveal/api"
import { RevealGate } from "@/features/reveal/components/reveal-gate"
import { RevealSummary } from "@/features/reveal/components/reveal-summary"
import { fetchSession } from "@/features/session/api"
import { qk } from "@/lib/query-keys"

/**
 * The post-session screen: journal, reveal, post-mortem.
 *
 * The reveal transitions **in place**. The trader should feel the curtain lift on the session they
 * just traded rather than being navigated somewhere new — so this is one screen with two states,
 * not two screens.
 */
export function JournalScreen({ sessionId }: { sessionId: string }) {
  const { data: session, isPending } = useQuery({
    queryKey: qk.session(sessionId),
    queryFn: () => fetchSession(sessionId),
  })
  const { data: reveal } = useQuery({
    queryKey: qk.sessionReveal(sessionId),
    queryFn: () => fetchReveal(sessionId),
    enabled: Boolean(session),
  })
  const { data: entries } = useQuery({
    queryKey: qk.journal(sessionId),
    queryFn: () => fetchJournal(sessionId),
    enabled: Boolean(session),
  })

  if (isPending || !session) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-28 w-full rounded-sm" />
        <Skeleton className="h-64 w-full rounded-sm" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Trade Journal &amp; Reveal</h1>
          <p className="metric text-sm text-muted-foreground">
            {session.barsScanned} / {session.totalBars} bars scanned · {session.status}
          </p>
        </div>
        {reveal ? null : <RevealGate session={session} />}
      </header>

      {reveal ? (
        <RevealSummary reveal={reveal} />
      ) : (
        <Card className="rounded-sm border-seam bg-panel">
          <CardHeader>
            <CardDescription className="label-caps">Still blinded</CardDescription>
            <CardTitle className="metric text-2xl tracking-tight">Asset masked</CardTitle>
          </CardHeader>
          <CardContent className="flex items-start gap-2 text-sm text-muted-foreground">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              The ticker, the dates and what happened next are all withheld until you choose to unblind. Write your
              post-mortem first — a read of the session made before you know the answer is the one worth keeping.
            </p>
          </CardContent>
        </Card>
      )}

      {/* 05.4's KPI strip and trade log. There are no fills to show because Sprint 04 has not been
          built, and an empty state that names the reason beats a grid of zeros — a row of 0.00s
          reads as a session where everything went wrong rather than one where nothing happened. */}
      <Card className="rounded-sm border-seam bg-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ReceiptText className="size-4 text-muted-foreground" aria-hidden="true" />
            Execution
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No trades in this session. Order execution, the risk gate and the fill engine arrive in Sprint 04; until then
          a session is a reading exercise, and the numbers above compare doing nothing against holding.
        </CardContent>
      </Card>

      <Card className="rounded-sm border-seam bg-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Notebook className="size-4 text-muted-foreground" aria-hidden="true" />
            What you wrote
          </CardTitle>
          <CardDescription>
            Anchored to the bar you were looking at. An edited entry keeps what it said before.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entries && entries.length > 0 ? (
            <ul className="divide-y divide-seam">
              {entries.map((entry) => (
                <li key={entry.id} className="space-y-1 py-2.5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="metric text-xs text-primary">bar {entry.barIndex + 1}</span>
                    {entry.emotion ? (
                      <span className="label-caps text-muted-foreground">{emotionLabels[entry.emotion]}</span>
                    ) : null}
                    {entry.conviction ? (
                      <span className="metric text-xs text-muted-foreground">conviction {entry.conviction}/5</span>
                    ) : null}
                    {/* Version above 1 means this was revised. Said plainly, because otherwise the
                        post-mortem presents a rewritten thesis as the original one. */}
                    {entry.version > 1 ? (
                      <span className="metric text-xs text-muted-foreground">edited ({entry.version - 1}×)</span>
                    ) : null}
                  </div>
                  {entry.thesis ? <p className="text-sm leading-snug">{entry.thesis}</p> : null}
                  {entry.note ? <p className="text-sm leading-snug text-muted-foreground">{entry.note}</p> : null}
                  {entry.mediaUrl ? (
                    /* Signed and short-lived, so it is a plain <img> rather than next/image — see
                       the journal panel for why caching it would outlive its authority. */
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entry.mediaUrl}
                      alt={`Screenshot attached at bar ${entry.barIndex + 1}`}
                      className="max-w-md border border-seam"
                    />
                  ) : null}
                  {entry.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {entry.tags.map((tag) => (
                        <span key={tag} className="metric border border-seam px-1 text-[11px] text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nothing was written during this session. The journal panel sits beside the chart in the terminal.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 05.6. The discipline index is Sprint 06's projector output. A pending state rather than a
          zero: a score of 0 out of 100 is a damning number to show a trader who has simply not been
          measured yet. */}
      <Card className="rounded-sm border-seam bg-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="size-4 text-muted-foreground" aria-hidden="true" />
            Behavioral discipline
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Not computed yet — the discipline projector is Sprint 06. It will grade stop respect, risk consistency,
          overtrading, plan adherence and patience from what you actually did, which needs trades to read.
        </CardContent>
      </Card>
    </div>
  )
}
