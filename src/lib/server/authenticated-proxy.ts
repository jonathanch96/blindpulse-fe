import "server-only"

import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import type { z } from "zod"

import { camelize, decamelize } from "@/lib/case"
import { authenticatedBackendFetch, UnauthenticatedError } from "@/lib/server/authenticated-backend"

function validationFailure(request: NextRequest, error: z.ZodError) {
  const traceId = request.headers.get("X-Request-ID") ?? crypto.randomUUID()
  return NextResponse.json(
    {
      success: false,
      code: "VALIDATION_FAILED",
      message: "The request contains invalid fields",
      data: null,
      meta: {},
      errors: error.issues.map((issue) => ({
        field: issue.path.join("."),
        rule: issue.code,
        message: issue.message,
      })),
      traceId,
      timestamp: new Date().toISOString(),
    },
    { status: 400, headers: { "X-Request-ID": traceId } },
  )
}

// Maps a thrown error to a response. Split out as a plain, synchronous function (no promises
// involved) so the UNAUTHENTICATED-vs-everything-else branching is unit-testable on its own,
// independent of mocking an async rejection.
export function proxyErrorResponse(error: unknown, request: NextRequest, path: string) {
  if (error instanceof UnauthenticatedError) {
    return NextResponse.json(
      {
        success: false,
        code: "UNAUTHENTICATED",
        message: "Authentication is required",
        data: null,
        meta: {},
        errors: [],
      },
      { status: 401 },
    )
  }
  // Anything else (network failure, backend unreachable, a bug here) is a real server error, not
  // a missing session — reporting it as UNAUTHENTICATED sends the user chasing a sign-in problem
  // that doesn't exist. Log the real cause and say so honestly instead.
  const traceId = request.headers.get("X-Request-ID") ?? crypto.randomUUID()
  console.error(`[authenticatedProxy] ${request.method} ${path} failed`, error)
  return NextResponse.json(
    {
      success: false,
      code: "INTERNAL_ERROR",
      message: "Something went wrong handling that request",
      data: null,
      meta: {},
      errors: [],
      traceId,
      timestamp: new Date().toISOString(),
    },
    { status: 502, headers: { "X-Request-ID": traceId } },
  )
}

export async function authenticatedProxy(
  request: NextRequest,
  path: string,
  schema?: z.ZodType,
) {
  try {
    const hasBody = !["GET", "HEAD", "DELETE"].includes(request.method)
    let value = hasBody ? await request.json().catch(() => undefined) : undefined
    if (schema) {
      const parsed = schema.safeParse(value)
      if (!parsed.success) return validationFailure(request, parsed.error)
      value = parsed.data
    }
    const { envelope, status } = await authenticatedBackendFetch(request, path, {
      method: request.method,
      requestId: request.headers.get("X-Request-ID") ?? undefined,
      body: value === undefined ? undefined : JSON.stringify(decamelize(value)),
    })
    return NextResponse.json(camelize(envelope), { status })
  } catch (error) {
    return proxyErrorResponse(error, request, path)
  }
}
