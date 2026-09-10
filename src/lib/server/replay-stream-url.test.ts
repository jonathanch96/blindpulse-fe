import { afterEach, describe, expect, it, vi } from "vitest"

import { replayStreamUrl } from "@/lib/server/replay-stream-url"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("replayStreamUrl", () => {
  it("turns https into wss and mounts the API prefix", () => {
    vi.stubEnv("BACKEND_BASE_URL", "https://api.blindpulse.io")
    expect(replayStreamUrl("/ws/sessions/abc")).toBe("wss://api.blindpulse.io/api/v1/ws/sessions/abc")
  })

  it("turns http into ws and keeps the port", () => {
    vi.stubEnv("BACKEND_BASE_URL", "http://localhost:8080")
    expect(replayStreamUrl("/ws/sessions/abc")).toBe("ws://localhost:8080/api/v1/ws/sessions/abc")
  })

  // BACKEND_BASE_URL is often an internal name the browser cannot resolve — a service name inside
  // a container network. A deployment overrides it, and the override has to win.
  it("prefers an explicit REPLAY_WS_URL over the internal backend address", () => {
    vi.stubEnv("BACKEND_BASE_URL", "http://api:8080")
    vi.stubEnv("REPLAY_WS_URL", "wss://stream.blindpulse.io")
    expect(replayStreamUrl("/ws/sessions/abc")).toBe("wss://stream.blindpulse.io/api/v1/ws/sessions/abc")
  })

  // A blanket "https means wss, everything else means ws" would downgrade a configured secure
  // socket to plaintext because of a config format. TLS is not this function's to drop.
  it("keeps an already-secure override secure", () => {
    vi.stubEnv("BACKEND_BASE_URL", "http://api:8080")
    vi.stubEnv("REPLAY_WS_URL", "wss://stream.blindpulse.io")
    expect(replayStreamUrl("/ws/sessions/abc")).toBe("wss://stream.blindpulse.io/api/v1/ws/sessions/abc")
  })

  it("rejects a scheme that is not http, https, ws or wss", () => {
    vi.stubEnv("REPLAY_WS_URL", "ftp://stream.blindpulse.io")
    expect(() => replayStreamUrl("/ws/sessions/abc")).toThrow(/unsupported scheme/)
  })

  it("ignores a blank override rather than treating it as configured", () => {
    vi.stubEnv("BACKEND_BASE_URL", "http://localhost:8080")
    vi.stubEnv("REPLAY_WS_URL", "   ")
    expect(replayStreamUrl("/ws/sessions/abc")).toBe("ws://localhost:8080/api/v1/ws/sessions/abc")
  })

  it("does not double the slash when the base carries a trailing one", () => {
    vi.stubEnv("BACKEND_BASE_URL", "http://localhost:8080/")
    expect(replayStreamUrl("/ws/sessions/abc")).toBe("ws://localhost:8080/api/v1/ws/sessions/abc")
  })

  // Failing loudly beats handing the browser a URL built from undefined, which would surface as
  // an inscrutable socket error rather than a misconfiguration.
  it("refuses to guess when nothing is configured", () => {
    vi.stubEnv("BACKEND_BASE_URL", "")
    vi.stubEnv("REPLAY_WS_URL", "")
    expect(() => replayStreamUrl("/ws/sessions/abc")).toThrow(/REPLAY_WS_URL or BACKEND_BASE_URL/)
  })
})
