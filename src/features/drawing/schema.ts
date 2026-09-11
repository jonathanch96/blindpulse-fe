import { z } from "zod"

import { toolSpecs } from "@/features/drawing/types"

const kinds = Object.keys(toolSpecs) as [string, ...string[]]

// The server's kind vocabulary is snake_case; the terminal's is camelCase for two of the eleven
// tools. The mapping lives in `api.ts` at the boundary, and this schema validates the wire form —
// so a tool added to the toolkit without a mapping fails here rather than being stored under a
// name nothing reads back.
export const drawingKinds = [
  "trendline", "horizontal", "ray", "extended", "vertical",
  "fib_retracement", "fib_extension", "zone", "polyline", "brush", "note",
] as const

export const createDrawingSchema = z.object({
  kind: z.enum(drawingKinds),
  timeframe: z.enum(["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"]),
  // Bounded below only. How far the trader may anchor is the cursor, which the server owns.
  createdBarIndex: z.number().int().min(0),
  // Opaque by design, exactly as on the server: the payload is the toolkit's shape, and validating
  // it here would mean this file changing for every tool. What the server does check — no dates —
  // it checks over the decoded JSON, and that check is the one that matters.
  payload: z.record(z.string(), z.unknown()),
})

export const updateDrawingSchema = z.object({
  payload: z.record(z.string(), z.unknown()),
})

export type CreateDrawingInput = z.infer<typeof createDrawingSchema>

// Guards against the toolkit and the wire vocabulary drifting apart. It is exported rather than
// asserted only in a test so the mapping has one source.
export const toolkitKinds = kinds
