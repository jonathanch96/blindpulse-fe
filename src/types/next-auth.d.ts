import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id: string }
    error?: "RefreshFailed" | "GoogleSignInFailed"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string
    refreshToken: string
    accessTokenExpiresAt: string
    refreshTokenExpiresAt: string
    error?: "RefreshFailed" | "GoogleSignInFailed"
  }
}
