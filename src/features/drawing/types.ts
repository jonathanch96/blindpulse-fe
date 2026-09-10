// The drawing model.
//
// The rule this file exists to hold: **an anchor is a bar index, never a timestamp** (BR-01,
// NFR-05). A trendline that remembered when it was drawn would date the window, and dating the
// window identifies the instrument as surely as naming it. There is no Date anywhere in this
// module, and `drawing.test.ts` asserts that structurally so a future field has to delete that
// test on purpose rather than forget this paragraph.
//
// Prices are decimal strings, the same as everywhere else the trader's numbers travel. Pixel
// geometry happens in `@/lib/chart-geometry`; nothing here does float arithmetic on a price.

export type DrawingTool =
  | "cursor"
  | "trendline"
  | "horizontal"
  | "ray"
  | "extended"
  | "vertical"
  | "fib"
  | "fibExtension"
  | "zone"
  | "polyline"
  | "brush"
  | "note"

export type DrawingKind = Exclude<DrawingTool, "cursor">

/** A point on the chart: which bar, and what price. Never when. */
export type Anchor = {
  index: number
  price: string
}

export type Drawing = {
  id: string
  kind: DrawingKind
  /**
   * The timeframe this was drawn on.
   *
   * Higher timeframes are their own index space — bar 214 on 15m and bar 214 on 1h are different
   * moments — so an anchor only means anything against the timeframe it was placed on. Rather than
   * convert (which would need the roll-up factor and would still land mid-bucket), a drawing is
   * shown on its own timeframe and hidden on the others. Hiding is honest; a line silently
   * relocated to the wrong bar is not.
   *
   * It is a duration like "15m", never a date.
   */
  timeframe: string
  anchors: Anchor[]
  /** Body text for a note. */
  text?: string
  /** Zone shading, 0–1. The trader adjusts it; a zone they cannot see through is a zone that hides price. */
  opacity?: number
}

export type ToolSpec = {
  label: string
  /** How many anchors the tool needs before it becomes a drawing. */
  anchors: number
  /** True for tools that keep collecting points until the trader ends the stroke. */
  freehand?: boolean
  hint: string
}

// The anchor counts are the tool's contract with the reducer: it commits a drawing the moment it
// has this many, so a tool that lies here either commits early (a half-drawn line) or never.
export const toolSpecs: Record<DrawingKind, ToolSpec> = {
  trendline: { label: "Trendline", anchors: 2, hint: "Two points; the segment between them" },
  horizontal: { label: "Horizontal", anchors: 1, hint: "One point; a level across the whole window" },
  ray: { label: "Ray", anchors: 2, hint: "Two points; extends forward only" },
  extended: { label: "Extended", anchors: 2, hint: "Two points; extends both ways" },
  vertical: { label: "Vertical", anchors: 1, hint: "One bar; a marker down the chart" },
  fib: { label: "Fib retracement", anchors: 2, hint: "Swing start to swing end" },
  fibExtension: { label: "Fib extension", anchors: 3, hint: "Impulse start, impulse end, retrace low" },
  zone: { label: "Supply / demand", anchors: 2, hint: "Two corners; a shaded box" },
  polyline: { label: "Polyline", anchors: 0, freehand: true, hint: "Click each point; double-click to finish" },
  brush: { label: "Brush", anchors: 0, freehand: true, hint: "Drag to draw" },
  note: { label: "Note", anchors: 1, hint: "One point; an annotation pinned to a bar" },
}

export const drawingKinds = Object.keys(toolSpecs) as DrawingKind[]
