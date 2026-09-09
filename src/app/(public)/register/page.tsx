import type { Metadata } from "next"
import Link from "next/link"

import { AuthShell } from "@/features/auth/auth-shell"
import { RegisterForm } from "@/features/auth/register-form"

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create a BlindPulse Replay Lab account and run your first zero-hindsight replay session.",
}

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Run your first blinded session in a few minutes."
      alternate={
        <>
          Already have an account?{" "}
          <Link className="font-medium text-primary hover:underline" href="/login">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  )
}
