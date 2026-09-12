import type { NextRequest } from "next/server"

import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

type Context = { params: Promise<{ id: string }> }

// The compliance readout. Proxied straight through with nothing added: the allowance left is a number
// only the server can compute, and a BFF that derived it from a balance and a limit would be a second
// answer to the question the gate already answers (SP4-1).
export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params
  return authenticatedProxy(request, `/sessions/${encodeURIComponent(id)}/risk`)
}
