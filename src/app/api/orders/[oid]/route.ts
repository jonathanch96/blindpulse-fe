import type { NextRequest } from "next/server"

import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

type Context = { params: Promise<{ oid: string }> }

export async function DELETE(request: NextRequest, { params }: Context) {
  const { oid } = await params
  return authenticatedProxy(request, `/orders/${encodeURIComponent(oid)}`)
}
