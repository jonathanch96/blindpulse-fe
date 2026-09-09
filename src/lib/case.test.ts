import { describe, expect, it } from "vitest"

import { camelize, decamelize } from "@/lib/case"

describe("boundary case conversion", () => {
  it("deeply converts objects and arrays", () => {
    const wire = { trace_id: "trace", data: [{ session_id: "abc123", nested_value: { user_id: "u1" } }] }
    expect(camelize(wire)).toEqual({ traceId: "trace", data: [{ sessionId: "abc123", nestedValue: { userId: "u1" } }] })
  })

  it("round-trips JSON-shaped camelCase data", () => {
    const value = { sessionId: "abc123", orderRows: [{ userId: "u1", filledPrice: "10.00" }] }
    expect(camelize(decamelize(value))).toEqual(value)
  })
})

