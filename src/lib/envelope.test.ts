import { describe, expect, it } from "vitest"

import { ApiError, apiErrorMessage, type Envelope } from "@/lib/envelope"

function envelope(overrides: Partial<Envelope<unknown>> = {}): Envelope<unknown> {
  return {
    success: false,
    code: "VALIDATION_FAILED",
    message: "The request contains invalid fields",
    data: null,
    meta: {},
    errors: [],
    traceId: "trace-1",
    timestamp: "2026-08-13T00:00:00.000Z",
    ...overrides,
  }
}

describe("apiErrorMessage", () => {
  it("prefers the specific field-level message over the generic envelope message", () => {
    const error = new ApiError(
      envelope({ errors: [{ field: "email", rule: "invalid_format", message: "Invalid email address" }] }),
      400,
    )
    expect(apiErrorMessage(error, "fallback")).toBe("Invalid email address")
  })

  it("falls back to the envelope's top-level message when there are no field errors", () => {
    const error = new ApiError(envelope({ message: "Something specific went wrong" }), 500)
    expect(apiErrorMessage(error, "fallback")).toBe("Something specific went wrong")
  })

  it("uses the fixed fallback for non-API errors", () => {
    expect(apiErrorMessage(new Error("network down"), "Could not save")).toBe("Could not save")
    expect(apiErrorMessage("not even an error", "Could not save")).toBe("Could not save")
  })
})
