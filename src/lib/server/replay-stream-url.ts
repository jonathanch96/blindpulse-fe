import "server-only"

// The replay websocket is the one connection the browser makes directly to the Go API rather than
// through this BFF. Next.js route handlers cannot proxy a WebSocket upgrade, and the alternative —
// re-streaming frames through a server-sent-events route — would put a hop between the trader and
// the market data that the latency readout is meant to measure.
//
// Direct means the browser needs a public URL for the API, which BACKEND_BASE_URL is not always:
// inside a container network it is often an internal name the browser cannot resolve. So a
// deployment can set REPLAY_WS_URL explicitly, and the derived value is only the fallback.
//
// This runs on the server and the resolved URL is handed to the client alongside its ticket, so
// there is no public env var and no URL-building logic in the browser to drift out of step.
export function replayStreamUrl(path: string): string {
  const configured = process.env.REPLAY_WS_URL?.trim()
  const base = configured || process.env.BACKEND_BASE_URL
  if (!base) {
    throw new Error("REPLAY_WS_URL or BACKEND_BASE_URL is required to build a replay stream URL")
  }
  const url = new URL(base)
  // Map http/https onto ws/wss, and leave an already-websocket scheme alone. A blanket
  // "https means wss, everything else means ws" would silently downgrade a configured wss:// URL
  // to a plaintext socket — dropping TLS because of a config format, which is not a decision this
  // function gets to make.
  const scheme: Record<string, string> = { "https:": "wss:", "http:": "ws:", "wss:": "wss:", "ws:": "ws:" }
  const mapped = scheme[url.protocol]
  if (!mapped) {
    throw new Error(`Replay stream URL has an unsupported scheme: ${url.protocol}`)
  }
  url.protocol = mapped
  // The API mounts its routes under /api/v1, the same prefix backendFetch uses. The backend hands
  // back the path within that prefix, so it stays the one place the route is spelled out.
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/api/v1${path}`
  return url.toString()
}
