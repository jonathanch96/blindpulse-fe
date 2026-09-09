import "server-only"

import type { NextAuthOptions, User } from "next-auth"
import type { JWT } from "next-auth/jwt"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"

import { loginSchema } from "@/features/auth/schema"
import type { BackendSession } from "@/features/auth/types"
import { backendFetch } from "@/lib/server/backend"

type TokenUser = User & {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: string
  refreshTokenExpiresAt: string
}

const refreshes = new Map<string, Promise<JWT>>()
const refreshGracePeriodMs = 5_000

export async function authorizeCredentials(credentials: Record<string, string> | undefined): Promise<TokenUser> {
  const parsed = loginSchema.safeParse(credentials)
  if (!parsed.success) throw new Error("VALIDATION_FAILED")

  const { envelope } = await backendFetch<BackendSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify(parsed.data),
  })
  if (!envelope.success || !envelope.data) throw new Error(envelope.code)

  return {
    id: envelope.data.user.id,
    email: envelope.data.user.email,
    name: envelope.data.user.name,
    image: envelope.data.user.avatar_url,
    accessToken: envelope.data.access_token,
    refreshToken: envelope.data.refresh_token,
    accessTokenExpiresAt: envelope.data.access_token_expires_at,
    refreshTokenExpiresAt: envelope.data.refresh_token_expires_at,
  }
}

// Trades a Google-verified ID token for a backend session, the same way authorizeCredentials
// trades an email/password for one - both land on the identical TokenUser shape below, so a
// Google sign-in gets the exact same access/refresh pair and rotation behavior as a password one.
export async function authorizeGoogle(idToken: string): Promise<TokenUser> {
  const { envelope } = await backendFetch<BackendSession>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ id_token: idToken }),
  })
  if (!envelope.success || !envelope.data) throw new Error(envelope.code)

  return {
    id: envelope.data.user.id,
    email: envelope.data.user.email,
    name: envelope.data.user.name,
    image: envelope.data.user.avatar_url,
    accessToken: envelope.data.access_token,
    refreshToken: envelope.data.refresh_token,
    accessTokenExpiresAt: envelope.data.access_token_expires_at,
    refreshTokenExpiresAt: envelope.data.refresh_token_expires_at,
  }
}

async function rotate(token: JWT): Promise<JWT> {
  try {
    const { envelope } = await backendFetch<BackendSession>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: token.refreshToken }),
    })
    if (!envelope.success || !envelope.data) throw new Error(envelope.code)
    return {
      ...token,
      name: envelope.data.user.name,
      email: envelope.data.user.email,
      picture: envelope.data.user.avatar_url,
      accessToken: envelope.data.access_token,
      refreshToken: envelope.data.refresh_token,
      accessTokenExpiresAt: envelope.data.access_token_expires_at,
      refreshTokenExpiresAt: envelope.data.refresh_token_expires_at,
      error: undefined,
    }
  } catch {
    return { ...token, error: "RefreshFailed" }
  }
}

export function refreshAccessToken(token: JWT): Promise<JWT> {
  const key = `${token.sub ?? "unknown"}:${token.refreshToken}`
  const existing = refreshes.get(key)
  if (existing) return existing
  const pending = rotate(token)
  refreshes.set(key, pending)
  void pending.finally(() => {
    const timer = setTimeout(() => {
      if (refreshes.get(key) === pending) refreshes.delete(key)
    }, refreshGracePeriodMs)
    timer.unref?.()
  })
  return pending
}

export async function logoutRefreshToken(refreshToken: string | undefined) {
  if (!refreshToken) return
  try {
    await backendFetch("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
  } catch {
    // The local encrypted session is cleared even when the backend is unavailable.
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: { email: { type: "email" }, password: { type: "password" } },
      authorize: authorizeCredentials,
    }),
    // Disabled (rejected at Google, harmlessly) until GOOGLE_CLIENT_ID/SECRET are configured -
    // see authorizeGoogle for how its ID token becomes a normal backend session.
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  events: {
    async signOut({ token }) {
      await logoutRefreshToken(token?.refreshToken)
    },
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && account.id_token) {
        try {
          const authenticated = await authorizeGoogle(account.id_token)
          return {
            ...token,
            sub: authenticated.id,
            accessToken: authenticated.accessToken,
            refreshToken: authenticated.refreshToken,
            accessTokenExpiresAt: authenticated.accessTokenExpiresAt,
            refreshTokenExpiresAt: authenticated.refreshTokenExpiresAt,
            error: undefined,
          }
        } catch {
          return { ...token, error: "GoogleSignInFailed" }
        }
      }
      if (user) {
        const authenticated = user as TokenUser
        return {
          ...token,
          sub: authenticated.id,
          accessToken: authenticated.accessToken,
          refreshToken: authenticated.refreshToken,
          accessTokenExpiresAt: authenticated.accessTokenExpiresAt,
          refreshTokenExpiresAt: authenticated.refreshTokenExpiresAt,
        }
      }
      const expiresAt = new Date(token.accessTokenExpiresAt).getTime()
      if (Number.isFinite(expiresAt) && Date.now() < expiresAt - 30_000) return token
      return refreshAccessToken(token)
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.sub ?? ""
      session.error = token.error
      return session
    },
  },
}
