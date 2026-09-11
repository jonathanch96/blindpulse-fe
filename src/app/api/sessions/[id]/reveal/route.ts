import type { NextRequest } from "next/server"

import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

type Context = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params
  return authenticatedProxy(request, `/sessions/${encodeURIComponent(id)}/reveal`)
}

// No body and no schema: the reveal takes no arguments, and giving it one would imply there is
// something about it to configure. There is not — it happens once, to the whole session.
export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params
  return authenticatedProxy(request, `/sessions/${encodeURIComponent(id)}/reveal`)
}
