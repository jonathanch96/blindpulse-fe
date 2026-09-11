import type { NextRequest } from "next/server"

import { createDrawingSchema } from "@/features/drawing/schema"
import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

type Context = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params
  return authenticatedProxy(request, `/sessions/${encodeURIComponent(id)}/drawings`)
}

export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params
  return authenticatedProxy(request, `/sessions/${encodeURIComponent(id)}/drawings`, createDrawingSchema)
}
