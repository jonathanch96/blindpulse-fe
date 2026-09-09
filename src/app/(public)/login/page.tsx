import type { Metadata } from "next"
import Link from "next/link"

import { AuthShell } from "@/features/auth/auth-shell"
import { LoginForm } from "@/features/auth/login-form"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to BlindPulse Replay Lab to resume your replay portfolios and journals.",
}

// Signing in lands on the terminal, not the marketing page — `next` only redirects somewhere else
// when the proxy bounced an authenticated route to /login.
function safeNext(value: string | string[] | undefined) {
  const path = Array.isArray(value) ? value[0] : value
  return path?.startsWith("/") && !path.startsWith("//") ? path : "/terminal"
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const params = await searchParams
  return (
    <AuthShell
      title="Welcome back"
      description="Resume a replay session or open a new blinded feed."
      alternate={
        <>
          New to BlindPulse?{" "}
          <Link className="font-medium text-primary hover:underline" href="/register">
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm nextPath={safeNext(params.next)} />
    </AuthShell>
  )
}
