import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { camelize } from "@/lib/case"
import { authenticatedBackendFetch } from "@/lib/server/authenticated-backend"
import { proxyErrorResponse } from "@/lib/server/authenticated-proxy"
import { replayStreamUrl } from "@/lib/server/replay-stream-url"

type Context = { params: Promise<{ id: string }> }

// Mints a single-use websocket ticket and resolves the socket URL server-side.
//
// This is not a plain proxy: the backend returns the path within its own API, and the browser has
// no business deciding where that API lives. Resolving here keeps the deployment topology on the
// server, where it is configured.
export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params
  const path = `/sessions/${encodeURIComponent(id)}/stream-ticket`
  try {
    const { envelope, status } = await authenticatedBackendFetch<{ ticket: string; path: string }>(
      request,
      path,
      { method: "POST", requestId: request.headers.get("X-Request-ID") ?? undefined },
    )
    const body = camelize(envelope)
    if (body.success && body.data?.path) {
      return NextResponse.json({ ...body, data: { ...body.data, url: replayStreamUrl(body.data.path) } }, { status })
    }
    return NextResponse.json(body, { status })
  } catch (error) {
    return proxyErrorResponse(error, request, path)
  }
}
