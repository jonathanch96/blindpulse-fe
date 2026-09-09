import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { camelize, decamelize } from "@/lib/case"
import { authenticatedBackendFetch } from "@/lib/server/authenticated-backend"

async function forward(request: NextRequest) {
  try {
    const body = request.method === "PATCH" ? await request.json().catch(() => undefined) : undefined
    const { envelope, status } = await authenticatedBackendFetch(request, "/users/me", {
      method: request.method,
      requestId: request.headers.get("X-Request-ID") ?? undefined,
      body: body === undefined ? undefined : JSON.stringify(decamelize(body)),
    })
    return NextResponse.json(camelize(envelope), { status })
  } catch {
    return NextResponse.json({ success: false, code: "UNAUTHENTICATED", message: "Authentication is required" }, { status: 401 })
  }
}

export const GET = forward
export const PATCH = forward
