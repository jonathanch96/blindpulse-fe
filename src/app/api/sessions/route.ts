import type { NextRequest } from "next/server"

import { authenticatedProxy } from "@/lib/server/authenticated-proxy"
import { startSessionSchema } from "@/features/session/schema"

export function GET(request: NextRequest) {
  return authenticatedProxy(request, "/sessions")
}

export function POST(request: NextRequest) {
  return authenticatedProxy(request, "/sessions", startSessionSchema)
}
