import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { backendFetch } from "@/lib/server/backend"

describe("backendFetch", () => {
  beforeEach(() => {
    vi.stubEnv("BACKEND_BASE_URL", "http://backend.test")
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("parses a well-formed envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true, code: "OK", message: "ok", data: { id: 1 }, meta: {}, errors: [] }), { status: 200 }),
      ),
    )

    const result = await backendFetch("/accounts/ABC123")

    expect(result.status).toBe(200)
    expect(result.envelope).toMatchObject({ code: "OK" })
  })

  // Reproduces the "Unexpected non-whitespace character after JSON" crash: something in front of
  // or inside the backend returned a body that isn't a single valid JSON document. Rather than
  // let response.json() throw an opaque SyntaxError with no context, backendFetch should throw an
  // error that names the request and shows what actually came back, so it's diagnosable from logs.
  it("throws a diagnosable error when the backend body is not valid JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("true{\"success\":true}", { status: 200 })))

    await expect(backendFetch("/sessions/ABC123/orders", { method: "DELETE" })).rejects.toThrow(
      /not valid JSON.*DELETE.*sessions\/ABC123\/orders.*200.*true\{"success":true\}/,
    )
  })
})
