import type { NextRequest } from "next/server"

import { updateDrawingSchema } from "@/features/drawing/schema"
import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

type Context = { params: Promise<{ id: string; did: string }> }

export async function PATCH(request: NextRequest, { params }: Context) {
  const { id, did } = await params
  return authenticatedProxy(
    request,
    `/sessions/${encodeURIComponent(id)}/drawings/${encodeURIComponent(did)}`,
    updateDrawingSchema,
  )
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const { id, did } = await params
  return authenticatedProxy(request, `/sessions/${encodeURIComponent(id)}/drawings/${encodeURIComponent(did)}`)
}
