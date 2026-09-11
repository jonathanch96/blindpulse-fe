import { describe, expect, it } from "vitest"

import { isEmptyPlan, syncPlan } from "@/features/drawing/sync"
import type { Drawing } from "@/features/drawing/types"

function line(id: string, anchors: Array<[number, string]>, extra: Partial<Drawing> = {}): Drawing {
  return {
    id,
    kind: "trendline",
    timeframe: "15m",
    anchors: anchors.map(([index, price]) => ({ index, price })),
    ...extra,
  }
}

describe("drawing sync plan", () => {
  it("creates what is new and deletes what is gone", () => {
    const before = [line("a", [[1, "1.0"], [2, "1.1"]]), line("b", [[3, "1.2"], [4, "1.3"]])]
    const after = [before[0], line("c", [[5, "1.4"], [6, "1.5"]])]

    const plan = syncPlan(before, after)
    expect(plan.created.map((drawing) => drawing.id)).toEqual(["c"])
    expect(plan.deletedIds).toEqual(["b"])
    expect(plan.updated).toEqual([])
  })

  // The reducer replaces the drawings array on every action, so a reference check would call the
  // whole list changed when the trader merely selected something — and that would be one PATCH per
  // drawing per click.
  it("ignores a new array holding the same drawings", () => {
    const before = [line("a", [[1, "1.0"], [2, "1.1"]])]
    const after = [line("a", [[1, "1.0"], [2, "1.1"]])]
    expect(isEmptyPlan(syncPlan(before, after))).toBe(true)
  })

  it("updates a drawing whose anchors moved", () => {
    const before = [line("a", [[1, "1.0"], [2, "1.1"]])]
    const after = [line("a", [[1, "1.0"], [9, "1.4"]])]

    const plan = syncPlan(before, after)
    expect(plan.updated.map((drawing) => drawing.id)).toEqual(["a"])
    expect(plan.created).toEqual([])
    expect(plan.deletedIds).toEqual([])
  })

  it("updates on a reshaded zone or a retyped note, not just on moved anchors", () => {
    const anchors: Array<[number, string]> = [[1, "1.0"], [2, "1.1"]]
    expect(syncPlan([line("a", anchors, { opacity: 0.2 })], [line("a", anchors, { opacity: 0.5 })]).updated).toHaveLength(1)
    expect(syncPlan([line("a", anchors, { text: "supply" })], [line("a", anchors, { text: "demand" })]).updated).toHaveLength(1)
  })

  it("plans a clear-all as deletions and nothing else", () => {
    const before = [line("a", [[1, "1.0"]]), line("b", [[2, "1.1"]])]
    const plan = syncPlan(before, [])
    expect(plan.deletedIds).toEqual(["a", "b"])
    expect(plan.created).toEqual([])
    expect(plan.updated).toEqual([])
  })

  it("reports an unchanged canvas as nothing to do", () => {
    const drawings = [line("a", [[1, "1.0"]])]
    expect(isEmptyPlan(syncPlan(drawings, drawings))).toBe(true)
    expect(isEmptyPlan(syncPlan([], []))).toBe(true)
  })
})
