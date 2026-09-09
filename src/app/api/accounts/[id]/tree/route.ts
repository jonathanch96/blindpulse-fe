import type { NextRequest } from "next/server"

import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

type Context = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params
  return authenticatedProxy(request, `/accounts/${encodeURIComponent(id)}/tree`)
}
