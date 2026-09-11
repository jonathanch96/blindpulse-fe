"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { KeyRound } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { changePassword } from "@/features/settings/api"
import { changePasswordFormSchema, type ChangePasswordFormInput } from "@/features/settings/schema"
import type { CurrentUser } from "@/features/settings/types"
import { ApiError, apiErrorMessage } from "@/lib/envelope"
import { qk } from "@/lib/query-keys"

// A password change is the one thing on this screen the server can refuse for a reason the form
// cannot predict, so the refusal is attached to the field it is about.
const fieldForCode: Record<string, keyof ChangePasswordFormInput> = {
  INVALID_CURRENT_PASSWORD: "currentPassword",
  VALIDATION_FAILED: "newPassword",
}

export function PasswordForm({ user }: { user: CurrentUser }) {
  const queryClient = useQueryClient()
  // An account that signed in with Google has no password to change — it is setting its first one.
  // The server draws the same distinction, so the form follows the account rather than assuming.
  const setting = !user.hasPassword
  const form = useForm<ChangePasswordFormInput>({
    resolver: zodResolver(changePasswordFormSchema(user.hasPassword)),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  })

  const mutation = useMutation({
    // Called through rather than passed by reference: useMutation hands the mutation function a
    // second argument (the query client and metadata), and letting that reach an API function whose
    // next parameter might mean something else is a trap for whoever adds one.
    mutationFn: (values: ChangePasswordFormInput) => changePassword(values),
    onSuccess: async () => {
      // The user row carries has_password, and setting a first password changes it. Refetching is
      // what turns this card from "Set a password" into "Change password" without a reload.
      await queryClient.invalidateQueries({ queryKey: qk.currentUser() })
      toast.success(setting ? "Password set" : "Password changed")
      form.reset({ currentPassword: "", newPassword: "", confirmPassword: "" })
    },
    onError: (error) => {
      const field = error instanceof ApiError ? fieldForCode[error.envelope.code] : undefined
      form.setError(field ?? "root", { message: apiErrorMessage(error, "Unable to change your password") })
    },
  })

  return (
    <Card className="rounded-sm border-seam bg-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4 text-muted-foreground" aria-hidden="true" />
          {setting ? "Set a password" : "Change password"}
        </CardTitle>
        <CardDescription>
          {setting
            ? "You signed in with Google, so there is no password on this account yet. Setting one lets you sign in either way."
            : "Changing your password does not sign out your other sessions — refresh tokens are rotated on use, not revoked here."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          {/* method="post" is the safety net: a submit that beats hydration would otherwise default
              to GET and write both passwords into the URL, history, and every access log. */}
          <form className="space-y-4" method="post" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            {setting ? null : (
              <FormField control={form.control} name="currentPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>Current password</FormLabel>
                  <FormControl><Input type="password" autoComplete="current-password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="newPassword" render={({ field }) => (
              <FormItem>
                <FormLabel>{setting ? "Password" : "New password"}</FormLabel>
                <FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl>
                <FormDescription>
                  At least 8 characters, with an uppercase letter, a lowercase letter, a number and a symbol.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="confirmPassword" render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm {setting ? "password" : "new password"}</FormLabel>
                <FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {form.formState.errors.root ? (
              <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>
            ) : null}

            <Button type="submit" className="rounded-sm font-semibold" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : setting ? "Set password" : "Change password"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
