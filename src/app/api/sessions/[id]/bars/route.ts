import type { NextRequest } from "next/server"

import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

type Context = { params: Promise<{ id: string }> }

// The query is forwarded verbatim. How far the trader may read is the server's decision, and a
// bound applied here would be a second, quieter answer to that question.
export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params
  return authenticatedProxy(request, `/sessions/${encodeURIComponent(id)}/bars${request.nextUrl.search}`)
}
