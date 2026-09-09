import "server-only"

import { NextRequest, NextResponse } from "next/server"

import { camelize, decamelize } from "@/lib/case"
import { backendFetch } from "@/lib/server/backend"

export async function proxy(request: NextRequest, path: string): Promise<NextResponse> {
  const hasBody = request.method !== "GET" && request.method !== "HEAD" && request.method !== "DELETE"
  const body = hasBody ? await request.json().catch(() => undefined) : undefined
  const { envelope, status } = await backendFetch(path, {
    method: request.method,
    requestId: request.headers.get("X-Request-ID") ?? undefined,
    body: body === undefined ? undefined : JSON.stringify(decamelize(body)),
  })
  const clientEnvelope = camelize(envelope)
  return NextResponse.json(clientEnvelope, {
    status,
    headers: clientEnvelope.traceId ? { "X-Request-ID": clientEnvelope.traceId } : undefined,
  })
}
