"use client"

import { useQuery } from "@tanstack/react-query"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchCurrentUser } from "@/features/settings/api"
import { PasswordForm } from "@/features/settings/components/password-form"
import { ProfileForm } from "@/features/settings/components/profile-form"
import { qk } from "@/lib/query-keys"

// FR-AUTH-04's missing half. The API and the BFF routes for profile and password have existed since
// Sprint 01 with nothing calling them, which meant there was no way to change a password inside the
// product at all.
export function SettingsPage() {
  const { data: user, isPending, isError } = useQuery({ queryKey: qk.currentUser(), queryFn: fetchCurrentUser })

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Account Settings</h1>
        <p className="text-sm text-muted-foreground">
          Your identity on this desk. Risk rules, balances and reset trees belong to an account
          iteration rather than to you — those live under Accounts &amp; Resets.
        </p>
      </header>

      {isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-sm" />
          <Skeleton className="h-72 w-full rounded-sm" />
        </div>
      ) : isError || !user ? (
        <Card className="rounded-sm border-bearish/40 bg-bearish-muted">
          <CardContent className="py-6 text-sm text-bearish">
            Your profile could not be loaded. The API may be unreachable — reload once it is back.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <ProfileForm user={user} />
          <PasswordForm user={user} />
        </div>
      )}
    </div>
  )
}
