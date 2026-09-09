"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { GoogleIcon } from "@/components/icons/google"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { authErrorCopy } from "@/features/auth/error-copy"
import { registerSchema, type RegisterInput } from "@/features/auth/schema"

type RegistrationResponse = {
  success: boolean
  code: string
}

// A brand-new account has no replay portfolio yet, and the terminal is useless without one, so
// registration lands on Accounts & Resets rather than on an empty chart. Kept as a named function
// (rather than a literal at the call site) because the destination becomes conditional as soon as
// invited or SSO-provisioned accounts arrive with a portfolio already attached.
export function registrationDestination() {
  return "/accounts"
}

export function RegisterForm() {
  const router = useRouter()
  const [error, setError] = useState<string>()
  const form = useForm<RegisterInput>({ resolver: zodResolver(registerSchema), defaultValues: { name: "", email: "", password: "" } })

  async function submit(values: RegisterInput) {
    setError(undefined)
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values),
      })
      const result = await response.json() as RegistrationResponse
      if (!response.ok || !result.success) {
        setError(authErrorCopy("register", result.code))
        return
      }
      const login = await signIn("credentials", { email: values.email, password: values.password, redirect: false })
      if (!login?.ok) {
        setError("Your account was created. Please sign in.")
        return
      }
      router.push(registrationDestination())
      router.refresh()
    } catch {
      setError(authErrorCopy("register", undefined))
    }
  }

  return (
    <Form {...form}>
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full gap-2 font-semibold"
        onClick={() => signIn("google", { callbackUrl: "/accounts" })}
      >
        <GoogleIcon className="size-[18px]" />
        Continue with Google
      </Button>
      <div className="my-[18px] flex items-center gap-2.5">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>
      {/* See login-form: without method="post" a pre-hydration submit leaks the password
          through the query string. */}
      <form className="space-y-4" method="post" onSubmit={form.handleSubmit(submit)}>
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Name</FormLabel><FormControl><Input autoComplete="name" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" autoComplete="email" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <p className="text-xs text-muted-foreground">Use at least 8 characters with a letter and a number.</p>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="h-11 w-full font-bold" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </Form>
  )
}
