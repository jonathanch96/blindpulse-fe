import type { NextRequest } from "next/server"

import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

type Context = { params: Promise<{ tid: string }> }

export async function POST(request: NextRequest, { params }: Context) {
  const { tid } = await params
  return authenticatedProxy(request, `/trades/${encodeURIComponent(tid)}/breakeven`)
}
