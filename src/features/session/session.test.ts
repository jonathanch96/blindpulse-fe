import { describe, expect, it } from "vitest"

import { seekSchema, speedSchema, stepSchema, timeframeSchema } from "@/features/session/schema"

describe("session command schemas", () => {
  // These mirror the server's bounds. They are not the enforcement — the server refuses the same
  // things — they just stop an obviously malformed request from leaving the browser.
  it("bounds a step and rejects a no-op", () => {
    expect(stepSchema.safeParse({ count: 1 }).success).toBe(true)
    expect(stepSchema.safeParse({ count: -20 }).success).toBe(true)
    expect(stepSchema.safeParse({ count: 0 }).success).toBe(false)
    expect(stepSchema.safeParse({ count: 501 }).success).toBe(false)
    expect(stepSchema.safeParse({ count: 1.5 }).success).toBe(false)
  })

  it("refuses a negative seek", () => {
    expect(seekSchema.safeParse({ barIndex: 0 }).success).toBe(true)
    expect(seekSchema.safeParse({ barIndex: -1 }).success).toBe(false)
  })

  // The PRD's speed set exactly. An arbitrary number would be refused by the server anyway, but a
  // control that can express an impossible value invites a UI that offers it.
  it("accepts only the published playback speeds", () => {
    for (const speed of ["0.5", "1", "3", "5", "10"]) {
      expect(speedSchema.safeParse({ speed }).success).toBe(true)
    }
    expect(speedSchema.safeParse({ speed: "2" }).success).toBe(false)
    expect(speedSchema.safeParse({ speed: "12" }).success).toBe(false)
  })

  it("accepts only known timeframes", () => {
    expect(timeframeSchema.safeParse({ timeframe: "1h" }).success).toBe(true)
    expect(timeframeSchema.safeParse({ timeframe: "7m" }).success).toBe(false)
  })
})
