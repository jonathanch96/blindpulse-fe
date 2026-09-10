import type { NextRequest } from "next/server"

import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

type Context = { params: Promise<{ id: string }> }

// The bar range is forwarded verbatim rather than defaulted here. The server owns how far a trader
// may read, and a convenience default in the BFF would be a second, quieter answer to that
// question — one that could drift from the authoritative one.
export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params
  return authenticatedProxy(request, `/feeds/${encodeURIComponent(id)}/bars${request.nextUrl.search}`)
}
