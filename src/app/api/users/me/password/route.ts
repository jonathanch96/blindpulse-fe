import type { NextRequest } from "next/server"

import { changePasswordSchema } from "@/features/auth/schema"
import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

export async function PATCH(request: NextRequest) {
  return authenticatedProxy(request, "/users/me/password", changePasswordSchema)
}
