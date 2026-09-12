import type { NextRequest } from "next/server"

import { amendTradeSchema } from "@/features/execution/schema"
import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

type Context = { params: Promise<{ tid: string }> }

export async function PATCH(request: NextRequest, { params }: Context) {
  const { tid } = await params
  return authenticatedProxy(request, `/trades/${encodeURIComponent(tid)}`, amendTradeSchema)
}
