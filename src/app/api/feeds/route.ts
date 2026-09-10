import type { NextRequest } from "next/server"

import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

export function GET(request: NextRequest) {
  return authenticatedProxy(request, `/feeds${request.nextUrl.search}`)
}
