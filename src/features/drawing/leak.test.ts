import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { drawingReducer, initialDrawingState } from "@/features/drawing/reducer"
import { retracementLevels } from "@/features/drawing/fib"
import type { Drawing } from "@/features/drawing/types"

// The drawing half of the NFR-05 guard.
//
// A drawing is the most natural place in the whole app for a timestamp to appear: every charting
// library anchors to time, and "when did I draw this" is an obvious field to add. On a blinded feed
// it is also a leak — a trendline that remembered when it was drawn would date the window, and
// dating the window identifies the instrument as surely as naming it (BR-01).
//
// So anchors are bar indices, and this file asserts that over the serialized drawing rather than
// over a list of field names, because the failure mode is always a field somebody added without
// reading the comment at the top of `types.ts`.

function build(): Drawing[] {
  let state = initialDrawingState
  state = drawingReducer(state, { type: "selectTool", tool: "trendline" })
  state = drawingReducer(state, { type: "place", anchor: { index: 214, price: "168.45319" }, id: "t1", timeframe: "15m" })
  state = drawingReducer(state, { type: "place", anchor: { index: 260, price: "171.00605" }, id: "t1", timeframe: "15m" })
  state = drawingReducer(state, { type: "selectTool", tool: "fib" })
  state = drawingReducer(state, { type: "place", anchor: { index: 214, price: "168.45319" }, id: "f1", timeframe: "15m" })
  state = drawingReducer(state, { type: "place", anchor: { index: 260, price: "171.00605" }, id: "f1", timeframe: "15m" })
  state = drawingReducer(state, { type: "selectTool", tool: "note" })
  state = drawingReducer(state, { type: "place", anchor: { index: 240, price: "170" }, id: "n1", timeframe: "15m" })
  state = drawingReducer(state, { type: "setText", id: "n1", text: "Swept the high, waiting for the retrace" })
  state = drawingReducer(state, { type: "selectTool", tool: "zone" })
  state = drawingReducer(state, { type: "place", anchor: { index: 220, price: "169" }, id: "z1", timeframe: "15m" })
  state = drawingReducer(state, { type: "place", anchor: { index: 250, price: "170.5" }, id: "z1", timeframe: "15m" })
  return state.drawings
}

// No trailing \b: in "2026-09-10T07:15:30Z" the digit and the T are both word characters, so a
// trailing boundary would miss the single most likely way a date reaches a payload.
const isoDate = /\b\d{4}-\d{2}-\d{2}/

describe("drawings carry no calendar information", () => {
  it("serializes with no date and no time-shaped field", () => {
    const body = JSON.stringify(build())
    expect(isoDate.test(body)).toBe(false)
    // Precise field names, not substrings. A drawing legitimately carries a *timeframe* — "15m" is
    // a duration, and the word contains "time" — so a substring ban on "time" would forbid the
    // right thing along with the wrong one. The ISO-date regex above and the clock check below are
    // the guards that actually catch a leak.
    for (const needle of ["timestamp", "createdat", "created_at", "openedat", "opened_at", "windowstart", "symbol", "instrument", "venue"]) {
      expect(body.toLowerCase()).not.toContain(needle)
    }
  })

  it("carries a timeframe as a duration rather than anything dated", () => {
    for (const drawing of build()) {
      expect(drawing.timeframe).toMatch(/^\d+[mhdw]$/)
    }
  })

  it("anchors every drawing by bar index", () => {
    for (const drawing of build()) {
      for (const anchor of drawing.anchors) {
        expect(Number.isInteger(anchor.index)).toBe(true)
        expect(Object.keys(anchor).sort()).toEqual(["index", "price"])
      }
    }
  })

  it("computes fib levels without introducing one", () => {
    const body = JSON.stringify(retracementLevels({ index: 1, price: "165" }, { index: 9, price: "185" }))
    expect(isoDate.test(body)).toBe(false)
  })

  // The structural half: no module in the drawing feature may reach for the clock at all. Catching
  // it at the source is what stops a date being added and then serialized somewhere this test's
  // fixtures do not reach.
  it("never touches the clock anywhere in the drawing feature", () => {
    const root = path.resolve("src/features/drawing")
    const files = fs
      .readdirSync(root)
      .filter((name) => /\.tsx?$/.test(name) && !name.includes(".test."))
    expect(files.length).toBeGreaterThan(0)

    const offenders = files.filter((name) => {
      const source = fs.readFileSync(path.join(root, name), "utf8")
      return /\bnew Date\b|Date\.now\(|toISOString\(|performance\.now\(/.test(source)
    })
    expect(offenders).toEqual([])
  })
})
