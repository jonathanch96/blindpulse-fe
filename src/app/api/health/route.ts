import { type NextRequest } from "next/server"

import { proxy } from "@/lib/server/proxy"

export function GET(request: NextRequest) {
  return proxy(request, "/ping")
}

