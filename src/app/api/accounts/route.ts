import type { NextRequest } from "next/server"

import { openAccountSchema } from "@/features/account/schema"
import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

export function GET(request: NextRequest) {
  return authenticatedProxy(request, `/accounts${request.nextUrl.search}`)
}

export function POST(request: NextRequest) {
  return authenticatedProxy(request, "/accounts", openAccountSchema)
}
