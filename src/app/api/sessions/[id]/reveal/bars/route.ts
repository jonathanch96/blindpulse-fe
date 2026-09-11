import type { NextRequest } from "next/server"

import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

type Context = { params: Promise<{ id: string }> }

// The disclosed series: real prices with real timestamps. It is a separate route from
// /sessions/{id}/bars rather than a mode of it, mirroring the server's separate response type — a
// blinded endpoint that could return unblinded data under some condition is the leak this design
// exists to make impossible.
export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params
  return authenticatedProxy(request, `/sessions/${encodeURIComponent(id)}/reveal/bars`)
}
