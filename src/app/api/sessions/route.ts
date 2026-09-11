import type { NextRequest } from "next/server"

import { authenticatedProxy } from "@/lib/server/authenticated-proxy"
import { startSessionSchema } from "@/features/session/schema"

// The query is forwarded verbatim: `?scope=history` asks for finished sessions rather than live
// ones, and which sessions a caller may see is the server's decision in both cases.
export function GET(request: NextRequest) {
  return authenticatedProxy(request, `/sessions${request.nextUrl.search}`)
}

export function POST(request: NextRequest) {
  return authenticatedProxy(request, "/sessions", startSessionSchema)
}
