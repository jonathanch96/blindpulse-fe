import { describe, expect, it } from "vitest"

import { buildScale } from "@/lib/chart-math"
import { buildProjection } from "@/features/drawing/projection"
import { drawDrawings } from "@/features/drawing/render"
import { retracementRatios } from "@/features/drawing/fib"
import type { Drawing } from "@/features/drawing/types"
import { createRecordingContext, hasAlpha, type RecordingContext } from "@/test/recording-canvas"

// The drawing half of review finding FE-03-2. Hit-testing and the fib maths were tested; what the
// renderer actually asked the canvas for was not — and a supply zone painted at full opacity hides
// the price it is drawn over, which is the thing the trader is looking at.

const palette = {
  bullish: "lab(80% -35 -29)",
  bearish: "lab(60% 55 20)",
  telemetry: "lab(79% -35 -29)",
  foreground: "lab(97% 0 -1)",
  muted: "lab(70% 0 0)",
  seam: "lab(20% 0 0)",
  panel: "lab(14% 0 0)",
}

const scale = buildScale("auto", 100, 200, 400, 150)
const projection = buildProjection(scale, 10, 0)

function draw(drawings: Drawing[], selectedId: string | null = null, draft: Drawing | null = null): RecordingContext {
  const ctx = createRecordingContext()
  drawDrawings(ctx, {
    drawings,
    draft,
    selectedId,
    projection,
    palette,
    plotWidth: 600,
    plotHeight: 400,
  })
  return ctx
}

const drawing = (id: string, kind: Drawing["kind"], anchors: [number, string][], extra: Partial<Drawing> = {}): Drawing => ({
  id,
  kind,
  timeframe: "15m",
  anchors: anchors.map(([index, price]) => ({ index, price })),
  ...extra,
})

describe("drawDrawings", () => {
  it("draws nothing when there is nothing to draw", () => {
    expect(draw([]).calls).toHaveLength(0)
  })

  // The regression that made this file worth writing: a zone at full opacity hides price.
  it("shades a supply zone rather than painting over the candles", () => {
    const ctx = draw([drawing("z", "zone", [[2, "160"], [12, "140"]])])
    const fills = ctx.where("fillRect")
    expect(fills.length, "the zone should have a fill").toBeGreaterThan(0)
    for (const call of fills) {
      expect(hasAlpha(call.fillStyle), `zone fill ${call.fillStyle} is opaque`).toBe(true)
    }
  })

  it("honours a zone's own shading", () => {
    const faint = draw([drawing("z", "zone", [[2, "160"], [12, "140"]], { opacity: 0.05 })])
    const solid = draw([drawing("z", "zone", [[2, "160"], [12, "140"]], { opacity: 0.9 })])
    expect(faint.where("fillRect")[0]?.fillStyle).not.toBe(solid.where("fillRect")[0]?.fillStyle)
  })

  it("gives a fib every level the PRD names", () => {
    const ctx = draw([drawing("f", "fib", [[2, "100"], [12, "200"]])])
    // One label per level, each carrying its ratio and its price.
    expect(ctx.texts).toHaveLength(retracementRatios.length)
    expect(ctx.texts.some((label) => label.text.includes("Golden Pocket"))).toBe(true)
    expect(ctx.texts.some((label) => label.text.includes("Equilibrium"))).toBe(true)
  })

  // The named levels are the ones traders act on, so reading the chart should not require reading
  // the labels.
  it("draws the named fib levels solid and the rest dashed", () => {
    const ctx = draw([drawing("f", "fib", [[2, "100"], [12, "200"]])])
    const strokes = ctx.calls.filter((call) => call.op === "stroke")
    expect(strokes.some((call) => call.lineDash.length === 0), "named levels should be solid").toBe(true)
    expect(strokes.some((call) => call.lineDash.length > 0), "unnamed levels should be dashed").toBe(true)
  })

  it("marks a selected drawing and gives it handles", () => {
    const line = drawing("t", "trendline", [[2, "120"], [12, "180"]])
    const plain = draw([line])
    const selected = draw([line], "t")

    expect(plain.where("arc"), "an unselected drawing has no handles").toHaveLength(0)
    expect(selected.where("arc"), "a selected trendline has two handles").toHaveLength(2)
    expect(selected.calls.some((call) => call.strokeStyle === palette.telemetry)).toBe(true)
  })

  // A brush stroke has hundreds of anchors; a handle on each would bury the stroke it belongs to.
  it("puts handles only on the ends of a brush stroke", () => {
    const points: [number, string][] = Array.from({ length: 40 }, (_, i) => [i, String(120 + i)])
    const ctx = draw([drawing("b", "brush", points)], "b")
    expect(ctx.where("arc")).toHaveLength(2)
  })

  // The draft is a preview of a commitment and should not read as something already on the chart.
  it("draws the in-progress shape dimmed and dashed", () => {
    const ctx = draw([], null, drawing("__draft__", "trendline", [[2, "120"], [8, "160"]]))
    expect(ctx.where("save").length, "the draft should not leak its style onto later drawings").toBeGreaterThan(0)
    expect(ctx.where("restore").length).toBeGreaterThan(0)
    expect(ctx.calls.some((call) => call.globalAlpha < 1), "the draft should be dimmed").toBe(true)
    expect(ctx.calls.some((call) => call.lineDash.length > 0), "the draft should be dashed").toBe(true)
  })

  it("ignores a shape that has not collected its anchors yet", () => {
    expect(draw([drawing("t", "trendline", [[2, "120"]])]).calls).toHaveLength(0)
  })

  it("renders a note with its text", () => {
    const ctx = draw([drawing("n", "note", [[5, "150"]], { text: "Swept the high" })])
    expect(ctx.texts.map((label) => label.text)).toContain("Swept the high")
  })

  it("labels an empty note rather than drawing an invisible box", () => {
    const ctx = draw([drawing("n", "note", [[5, "150"]], { text: "   " })])
    expect(ctx.texts.map((label) => label.text)).toContain("Note")
  })

  // NFR-05 at the renderer: nothing a drawing paints may carry a date.
  it("never writes a date onto the chart", () => {
    const ctx = draw([
      drawing("f", "fib", [[2, "100"], [12, "200"]]),
      drawing("n", "note", [[5, "150"]], { text: "Waiting for the retrace" }),
    ])
    for (const label of ctx.texts) {
      expect(label.text).not.toMatch(/\d{4}-\d{2}-\d{2}/)
    }
  })
})
