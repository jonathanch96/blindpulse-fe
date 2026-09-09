import type { JWT } from "next-auth/jwt"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { authorizeCredentials, authorizeGoogle, logoutRefreshToken, refreshAccessToken } from "@/lib/server/auth-options"

const backendFetch = vi.hoisted(() => vi.fn())
vi.mock("@/lib/server/backend", () => ({ backendFetch }))

const session = {
  user: { id: "user-1", email: "a@example.com", name: "A", avatar_url: null, created_at: "", updated_at: "" },
  access_token: "access-new", refresh_token: "refresh-new",
  access_token_expires_at: "2026-08-05T01:00:00Z", refresh_token_expires_at: "2026-09-05T01:00:00Z",
}

describe("NextAuth backend integration", () => {
  beforeEach(() => backendFetch.mockReset())

  it("maps backend login success into a server-side token user", async () => {
    backendFetch.mockResolvedValue({ status: 200, envelope: { success: true, data: session } })
    await expect(authorizeCredentials({ email: " A@Example.com ", password: "Password1" })).resolves.toMatchObject({
      id: "user-1", email: "a@example.com", accessToken: "access-new", refreshToken: "refresh-new",
    })
    expect(backendFetch).toHaveBeenCalledWith("/auth/login", expect.objectContaining({ body: JSON.stringify({ email: "a@example.com", password: "Password1" }) }))
  })

  it("surfaces the backend catalog code for failed authorization", async () => {
    backendFetch.mockResolvedValue({ status: 401, envelope: { success: false, code: "INVALID_CREDENTIALS", data: null } })
    await expect(authorizeCredentials({ email: "a@example.com", password: "wrong" })).rejects.toThrow("INVALID_CREDENTIALS")
  })

  it("maps a verified Google ID token into the same server-side token user shape", async () => {
    backendFetch.mockResolvedValue({ status: 200, envelope: { success: true, data: session } })
    await expect(authorizeGoogle("google-id-token")).resolves.toMatchObject({
      id: "user-1", email: "a@example.com", accessToken: "access-new", refreshToken: "refresh-new",
    })
    expect(backendFetch).toHaveBeenCalledWith("/auth/google", expect.objectContaining({ body: JSON.stringify({ id_token: "google-id-token" }) }))
  })

  it("surfaces the backend catalog code when Google verification fails", async () => {
    backendFetch.mockResolvedValue({ status: 401, envelope: { success: false, code: "GOOGLE_TOKEN_INVALID", data: null } })
    await expect(authorizeGoogle("bad-token")).rejects.toThrow("GOOGLE_TOKEN_INVALID")
  })

  it("single-flights concurrent refresh rotation per user", async () => {
    let resolve!: (value: unknown) => void
    backendFetch.mockReturnValue(new Promise((done) => { resolve = done }))
    const token = { sub: "user-1", accessToken: "old", refreshToken: "refresh-old", accessTokenExpiresAt: "2020-01-01", refreshTokenExpiresAt: "2030-01-01" } as JWT
    const first = refreshAccessToken(token)
    const second = refreshAccessToken(token)
    expect(backendFetch).toHaveBeenCalledTimes(1)
    resolve({ status: 200, envelope: { success: true, data: session } })
    await expect(Promise.all([first, second])).resolves.toEqual([
      expect.objectContaining({ accessToken: "access-new", refreshToken: "refresh-new" }),
      expect.objectContaining({ accessToken: "access-new", refreshToken: "refresh-new" }),
    ])
    await refreshAccessToken(token)
    expect(backendFetch).toHaveBeenCalledTimes(1)
  })

  it("revokes the refresh token on sign out", async () => {
    backendFetch.mockResolvedValue({ status: 200, envelope: { success: true, data: null } })
    await logoutRefreshToken("refresh-current")
    expect(backendFetch).toHaveBeenCalledWith("/auth/logout", expect.objectContaining({ body: JSON.stringify({ refresh_token: "refresh-current" }) }))
  })
})
