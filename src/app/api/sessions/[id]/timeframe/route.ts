import type { NextRequest } from "next/server"

import { authenticatedProxy } from "@/lib/server/authenticated-proxy"
import { timeframeSchema } from "@/features/session/schema"

type Context = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params
  return authenticatedProxy(request, `/sessions/${encodeURIComponent(id)}/timeframe`, timeframeSchema)
}
