import type { NextRequest } from "next/server"

import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

export function POST(request: NextRequest) {
  return authenticatedProxy(request, `/feeds/random${request.nextUrl.search}`)
}
