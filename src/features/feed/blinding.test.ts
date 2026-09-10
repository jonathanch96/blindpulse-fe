import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { tickOffsetLabel } from "@/features/feed/labels"

// The frontend half of the NFR-05 guard. The backend already refuses to send an identity, and that
// is the real enforcement — but the two layers exist independently on purpose: either one alone is
// one refactor away from failing quietly, and this is the product's central promise (BR-01).

function sourceOf(relative: string): string {
  return fs.readFileSync(path.resolve(relative), "utf8")
}

function filesUnder(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? filesUnder(target) : [target]
  })
}

describe("blinded feed contract", () => {
  // A field the type does not have is a field the UI cannot render by accident. This test fails if
  // somebody widens the contract "because the API might send it" — the API does not.
  it("declares no identity-bearing field on the feed types", () => {
    const source = sourceOf("src/features/feed/types.ts")
    const banned = ["symbol", "instrumentId", "instrument_id", "windowStart", "windowEnd", "macroLabel", "openedAt", "venue"]
    const declared = banned.filter((field) => new RegExp(`^\\s*${field}\\??:`, "m").test(source))
    expect(declared).toEqual([])
  })

  // A blinded bar carries an index where a chart would normally carry a time. If a timestamp ever
  // appears on this type, every axis label in the terminal becomes a date leak.
  it("gives bars an index rather than a timestamp", () => {
    const source = sourceOf("src/features/feed/types.ts")
    // Character classes rather than the `s` flag: tsconfig targets ES2017, where it is unavailable.
    expect(/export type FeedBar = \{[\s\S]*?\bindex: number/.test(source)).toBe(true)
    expect(/export type FeedBar = \{[\s\S]*?\}/.exec(source)?.[0] ?? "").not.toMatch(/\b(timestamp|openedAt|time)\??:/)
  })

  // Prices stay strings all the way through the UI (NFR-08). A price that has been through a JS
  // number is not the price the server quoted.
  it("types every price as a string", () => {
    const source = sourceOf("src/features/feed/types.ts")
    for (const field of ["open", "high", "low", "close", "volume"]) {
      expect(new RegExp(`^\\s*${field}: string`, "m").test(source)).toBe(true)
    }
  })

  // No feed-facing component may format a date. Catching this at the source level covers the
  // helpers a future component might reach for, not just the ones that exist today.
  it("never formats a calendar date in feed components", () => {
    const files = filesUnder("src/features/feed")
    const offenders = files
      .filter((file) => /\.tsx?$/.test(file) && !file.includes(".test."))
      .filter((file) => /toLocaleDateString|toLocaleString|new Date\(|date-fns/.test(fs.readFileSync(file, "utf8")))
    expect(offenders).toEqual([])
  })
})

describe("tickOffsetLabel", () => {
  // Position is always expressed relative to the playhead. "T-140" says where the trader is;
  // a calendar date says how it ended.
  it("labels the playhead and the past relative to the cursor", () => {
    expect(tickOffsetLabel(140, 140)).toBe("T-0 · live playhead")
    expect(tickOffsetLabel(0, 140)).toBe("T-140")
  })

  it("marks bars beyond the cursor as the future window rather than showing them as past", () => {
    expect(tickOffsetLabel(200, 140)).toBe("T+60 · future window")
  })
})
