"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { updateProfile } from "@/features/settings/api"
import { profileSchema, type ProfileInput } from "@/features/settings/schema"
import type { CurrentUser } from "@/features/settings/types"
import { apiErrorMessage } from "@/lib/envelope"
import { qk } from "@/lib/query-keys"

export function ProfileForm({ user }: { user: CurrentUser }) {
  const queryClient = useQueryClient()
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, avatarUrl: user.avatarUrl ?? "" },
  })

  const mutation = useMutation({
    // See password-form: useMutation passes a second argument that has no business reaching the API
    // layer.
    mutationFn: (values: ProfileInput) => updateProfile(values),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: qk.currentUser() })
      toast.success("Profile updated")
      // Reset to what the server stored rather than to what was typed: the name is trimmed server
      // side, so re-seeding from the response keeps the form's idea of "unchanged" honest.
      if (updated) form.reset({ name: updated.name, avatarUrl: updated.avatarUrl ?? "" })
    },
    onError: (error) => form.setError("root", { message: apiErrorMessage(error, "Unable to save your profile") }),
  })

  // useWatch rather than form.watch: the latter hands back a function the React Compiler refuses to
  // memoize, which makes every value derived from it a stale-UI risk.
  const [preview, typedName] = useWatch({ control: form.control, name: ["avatarUrl", "name"] })

  return (
    <Card className="rounded-sm border-seam bg-panel">
      <CardHeader>
        <CardTitle className="text-base">Profile</CardTitle>
        <CardDescription>
          Your display name and picture. Neither appears on a blinded chart — nothing here can
          identify an instrument.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-4" method="post" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <div className="flex items-center gap-3">
              <Avatar size="lg">
                {/* Only rendered once there is something to render: an <img src=""> resolves to the
                    current page and fetches the whole document again. */}
                {preview ? <AvatarImage src={preview} alt="" /> : null}
                <AvatarFallback>{initials(typedName || user.email)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.name}</p>
                {/* The email is shown, not edited: changing it would move the identity an account's
                    whole reset tree and ledger hang off, which is not a settings-screen operation
                    and has no endpoint behind it. */}
                <p className="metric truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Display name</FormLabel>
                <FormControl><Input autoComplete="name" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="avatarUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>Avatar URL</FormLabel>
                <FormControl><Input inputMode="url" placeholder="https://" {...field} /></FormControl>
                <FormDescription>Leave it empty to remove your picture.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            {form.formState.errors.root ? (
              <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>
            ) : null}

            <Button
              type="submit"
              className="rounded-sm font-semibold"
              // Disabled while clean as well as while saving: a button that posts an unchanged
              // profile trains people to press it and wonder whether anything happened.
              disabled={mutation.isPending || !form.formState.isDirty}
            >
              {mutation.isPending ? "Saving…" : "Save profile"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  const letters = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]
  return letters.toUpperCase()
}
