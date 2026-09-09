import { NextResponse } from "next/server"

import { registerSchema } from "@/features/auth/schema"
import type { BackendSession } from "@/features/auth/types"
import { camelize } from "@/lib/case"
import { backendFetch } from "@/lib/server/backend"

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, code: "VALIDATION_FAILED", message: "Check the highlighted fields" }, { status: 400 })
  }
  const { envelope, status } = await backendFetch<BackendSession>("/auth/register", {
    method: "POST",
    requestId: request.headers.get("X-Request-ID") ?? undefined,
    body: JSON.stringify(parsed.data),
  })
  return NextResponse.json(camelize(envelope), { status })
}
