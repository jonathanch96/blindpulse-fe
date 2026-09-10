"use client"

import Link from "next/link"
import { ChevronsRight, Lock, Pause, SkipBack, SkipForward } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const timeframes = ["1m", "5m", "15m", "1h", "4h", "1D"] as const
const speeds = ["0.5x", "1x", "3x", "5x", "10x"] as const

// The terminal's docking grid, rendered in its resting state: the panes, the transport, and the
// bracket dock in the exact positions the live session will occupy. Every control is disabled and
// every readout is blank rather than filled with plausible-looking numbers — an invented price in
// a trading tool is indistinguishable from a real one until somebody acts on it.
export function ReplayTerminal() {
  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-seam bg-panel px-3 py-2">
        <span className="flex items-center gap-2 border border-seam bg-panel-raised px-2 py-1">
          <Lock className="size-3.5 text-primary" aria-hidden="true" />
          <span className="metric text-[13px] font-semibold">Asset #—</span>
          <span className="label-caps text-muted-foreground">Masked</span>
        </span>
        <div className="flex items-center gap-px border border-seam" role="group" aria-label="Timeframe">
          {timeframes.map((timeframe) => (
            <button
              key={timeframe}
              type="button"
              disabled
              className={cn(
                "metric px-2.5 py-1 text-xs text-muted-foreground disabled:cursor-not-allowed",
                timeframe === "15m" && "bg-primary text-primary-foreground",
              )}
            >
              {timeframe}
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-px bg-seam lg:grid-cols-[1fr_20rem]">
        <div className="flex min-h-0 flex-col gap-px bg-seam">
          <Pane label="Price · candles, fibs, zones, EMA overlay" className="flex-1">
            <SessionPrompt />
          </Pane>
          <Pane label="RSI (14)" className="h-32 shrink-0" />
          <div className="flex shrink-0 items-center justify-center gap-3 bg-panel px-3 py-2">
            <div className="flex items-center gap-px border border-seam" role="group" aria-label="Transport">
              <TransportButton label="Step back"><SkipBack className="size-4" /></TransportButton>
              <TransportButton label="Play"><Pause className="size-4" /></TransportButton>
              <TransportButton label="Step forward"><SkipForward className="size-4" /></TransportButton>
            </div>
            <div className="flex items-center gap-px border border-seam" role="group" aria-label="Playback speed">
              {speeds.map((speed) => (
                <button
                  key={speed}
                  type="button"
                  disabled
                  className={cn(
                    "metric px-2 py-1.5 text-xs text-muted-foreground disabled:cursor-not-allowed",
                    speed === "1x" && "bg-telemetry text-telemetry-foreground",
                  )}
                >
                  {speed}
                </button>
              ))}
            </div>
            <span className="metric text-xs text-muted-foreground">—/—</span>
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-px bg-seam">
          <Pane label="Account metrics" className="shrink-0">
            <dl className="space-y-2">
              <Readout label="Equity" />
              <Readout label="Free margin" />
              <Readout label="Unrealized P&L" />
            </dl>
          </Pane>
          <Pane label="Risk bracket dock" className="flex-1">
            <div className="grid grid-cols-2 gap-px bg-seam">
              <Button disabled className="h-14 rounded-none bg-bullish text-bullish-foreground hover:bg-bullish">
                <span className="label-caps">Buy / Long</span>
              </Button>
              <Button disabled className="h-14 rounded-none bg-bearish text-bearish-foreground hover:bg-bearish">
                <span className="label-caps">Sell / Short</span>
              </Button>
            </div>
            <dl className="mt-3 space-y-2">
              <Readout label="Take profit" />
              <Readout label="Stop loss (required)" />
              <Readout label="Realized R:R" />
            </dl>
          </Pane>
        </div>
      </div>

      <Pane label="Open positions · pending orders · session trades" className="h-28 shrink-0 border-t border-seam" />
    </div>
  )
}

function Pane({ label, className, children }: { label: string; className?: string; children?: React.ReactNode }) {
  return (
    <section className={cn("flex min-h-0 flex-col bg-panel", className)} aria-label={label}>
      <p className="label-caps border-b border-seam px-3 py-1.5 text-muted-foreground">{label}</p>
      <div className="min-h-0 flex-1 overflow-auto p-3">{children}</div>
    </section>
  )
}

function TransportButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled
      aria-label={label}
      className="px-2.5 py-1.5 text-muted-foreground disabled:cursor-not-allowed"
    >
      {children}
    </button>
  )
}

function Readout({ label }: { label: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="label-caps text-muted-foreground">{label}</dt>
      <dd className="metric text-sm text-muted-foreground">—</dd>
    </div>
  )
}

function SessionPrompt() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm font-medium">No replay session running</p>
      <p className="max-w-md text-sm text-muted-foreground">
        The replay engine — blinded feed selection, the deterministic cursor, and the websocket that streams bars at
        playback speed — lands in Sprint 03. Until then this workspace shows the terminal&apos;s layout, not live data.
      </p>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ChevronsRight className="size-3.5" aria-hidden="true" />
        <Link href="/feeds" className="text-telemetry hover:underline">
          Browse blinded feeds
        </Link>
        , then open a replay portfolio under Accounts &amp; Resets.
      </p>
    </div>
  )
}
