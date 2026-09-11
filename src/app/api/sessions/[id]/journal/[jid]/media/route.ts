import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { camelize } from "@/lib/case"
import { authenticatedBackendFetch, UnauthenticatedError } from "@/lib/server/authenticated-backend"

type Context = { params: Promise<{ id: string; jid: string }> }

/**
 * The one route that does not go through `authenticatedProxy`.
 *
 * That helper reads a JSON body, validates it against a schema and re-encodes it as JSON with the
 * keys decamelized. A multipart upload survives none of that — the boundary would be lost and the
 * bytes mangled — so the body is streamed through untouched and the content type is forwarded so
 * the server can find the boundary it was given.
 */
export async function POST(request: NextRequest, { params }: Context) {
  const { id, jid } = await params
  const path = `/sessions/${encodeURIComponent(id)}/journal/${encodeURIComponent(jid)}/media`
  try {
    const body = await request.arrayBuffer()
    const { envelope, status } = await authenticatedBackendFetch(request, path, {
      method: "POST",
      requestId: request.headers.get("X-Request-ID") ?? undefined,
      body: Buffer.from(body),
      // Carried verbatim: the header holds the multipart boundary, and a regenerated one would not
      // match the bytes. Without it `backendFetch` would default to application/json and the server
      // would reject a body it had been told to parse as something it is not.
      headers: { "Content-Type": request.headers.get("content-type") ?? "application/octet-stream" },
    })
    return NextResponse.json(camelize(envelope), { status })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json(
        { success: false, code: "UNAUTHENTICATED", message: "Authentication is required", data: null, meta: {}, errors: [] },
        { status: 401 },
      )
    }
    console.error(`[journal media] POST ${path} failed`, error)
    return NextResponse.json(
      { success: false, code: "INTERNAL_ERROR", message: "Something went wrong handling that upload", data: null, meta: {}, errors: [] },
      { status: 502 },
    )
  }
}
