import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { proxy } from "@/lib/server/proxy"

const backendFetch = vi.hoisted(() => vi.fn())

vi.mock("@/lib/server/backend", () => ({ backendFetch }))

describe("proxy", () => {
  beforeEach(() => backendFetch.mockReset())

  it("passes through backend status and camelizes the envelope", async () => {
    backendFetch.mockResolvedValue({
      status: 422,
      envelope: {
        success: false,
        code: "EXCHANGE_RATE_MISSING",
        message: "An exchange rate is required",
        data: null,
        meta: {},
        errors: [],
        trace_id: "trace-1",
        timestamp: "2026-08-05T00:00:00.000Z",
      },
    })
    const request = new NextRequest("http://localhost/api/example", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Request-ID": "trace-1" },
      body: JSON.stringify({ sessionId: "abc123" }),
    })

    const response = await proxy(request, "/example")

    expect(response.status).toBe(422)
    expect(response.headers.get("X-Request-ID")).toBe("trace-1")
    expect(await response.json()).toMatchObject({ code: "EXCHANGE_RATE_MISSING", traceId: "trace-1" })
    expect(backendFetch).toHaveBeenCalledWith("/example", expect.objectContaining({ body: JSON.stringify({ session_id: "abc123" }) }))
  })
})
