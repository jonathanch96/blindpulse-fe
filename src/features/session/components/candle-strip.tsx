"use client"

import { useMemo } from "react"

import type { SessionBar } from "@/features/session/types"
import { cn } from "@/lib/utils"

// An SVG candle strip: enough to see the price action and prove the cursor moves, deliberately not
// the full chart. Slice 03D replaces this with a canvas renderer carrying EMAs, RSI, scale modes
// and the drawing tools, because SVG cannot hold 60 FPS at 10x with overlays.
//
// It renders only what the server sent. There is no zoom, no pan and no lookahead, so there is no
// way for it to display a bar the session has not released.
export function CandleStrip({ bars, height = 320 }: { bars: SessionBar[]; height?: number }) {
  const visible = useMemo(() => bars.slice(-160), [bars])

  const geometry = useMemo(() => {
    if (visible.length === 0) return null
    let low = Number.POSITIVE_INFINITY
    let high = Number.NEGATIVE_INFINITY
    for (const bar of visible) {
      low = Math.min(low, Number(bar.low))
      high = Math.max(high, Number(bar.high))
    }
    if (!Number.isFinite(low) || !Number.isFinite(high) || high === low) return null
    // A little headroom so the extremes are not flush against the pane edge.
    const pad = (high - low) * 0.08
    return { low: low - pad, high: high + pad }
  }, [visible])

  if (!geometry || visible.length === 0) {
    return <div className="grid h-full place-items-center text-xs text-muted-foreground">No bars released yet</div>
  }

  const width = 1000
  const slot = width / visible.length
  const bodyWidth = Math.max(1.5, slot * 0.62)
  const toY = (value: number) => {
    const ratio = (value - geometry.low) / (geometry.high - geometry.low)
    return height - ratio * height
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-full w-full"
      role="img"
      aria-label={`${visible.length} candles, most recent close ${visible[visible.length - 1]?.close}`}
    >
      {visible.map((bar, position) => {
        const open = Number(bar.open)
        const close = Number(bar.close)
        const rising = close >= open
        const x = position * slot + slot / 2
        const bodyTop = toY(Math.max(open, close))
        const bodyBottom = toY(Math.min(open, close))
        return (
          <g
            key={bar.index}
            className={cn(rising ? "text-bullish" : "text-bearish")}
            // The forming bar is drawn hollow and half-opacity: it has not closed, and a solid
            // candle would assert an hour of price action the trader has not been shown.
            opacity={bar.forming ? 0.5 : 1}
          >
            <line x1={x} x2={x} y1={toY(Number(bar.high))} y2={toY(Number(bar.low))} stroke="currentColor" strokeWidth={1} />
            <rect
              x={x - bodyWidth / 2}
              y={bodyTop}
              width={bodyWidth}
              height={Math.max(1, bodyBottom - bodyTop)}
              fill={bar.forming ? "none" : "currentColor"}
              stroke="currentColor"
              strokeWidth={bar.forming ? 1 : 0}
              strokeDasharray={bar.forming ? "2 2" : undefined}
            />
          </g>
        )
      })}
    </svg>
  )
}
