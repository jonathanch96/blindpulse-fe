import "server-only"

import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"

import { camelize } from "@/lib/case"
import { backendFetch, type BackendInit, type BackendResult } from "@/lib/server/backend"

// Distinguishes "there is genuinely no session" from any other failure (network error, backend
// down, a bug in this route) so authenticatedProxy doesn't misreport the latter as the former.
export class UnauthenticatedError extends Error {
  constructor() {
    super("UNAUTHENTICATED")
    this.name = "UnauthenticatedError"
  }
}

export async function authenticatedBackendFetch<T>(request: NextRequest, path: string, init: BackendInit = {}): Promise<BackendResult<T>> {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.accessToken) throw new UnauthenticatedError()
  const result = await backendFetch<T>(path, { ...init, accessToken: token.accessToken })
  return { ...result, envelope: camelize(result.envelope) }
}
