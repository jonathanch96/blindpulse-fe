import { z } from "zod"

import { playbackSpeeds } from "@/features/session/types"

export const startSessionSchema = z.object({
  accountId: z.uuid(),
  feedId: z.uuid(),
  timeframe: z.string().trim().optional(),
})

// Bounded on both sides. The server enforces the same limit; this one exists so an obviously
// malformed request never leaves the browser, not as the enforcement.
export const stepSchema = z.object({
  count: z.number().int().min(-500).max(500).refine((value) => value !== 0, "A step of zero does nothing"),
})

export const seekSchema = z.object({
  barIndex: z.number().int().min(0),
})

export const speedSchema = z.object({
  speed: z.enum(playbackSpeeds),
})

export const timeframeSchema = z.object({
  timeframe: z.enum(["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"]),
})
