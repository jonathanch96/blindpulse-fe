import type { ChangePasswordFormInput, ProfileInput } from "@/features/settings/schema"
import type { CurrentUser } from "@/features/settings/types"
import { apiFetch } from "@/lib/api-client"

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const envelope = await apiFetch<CurrentUser>("/api/users/me")
  return envelope.data
}

export async function updateProfile(input: ProfileInput): Promise<CurrentUser | null> {
  const envelope = await apiFetch<CurrentUser>("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  })
  return envelope.data
}

export async function changePassword(input: ChangePasswordFormInput): Promise<void> {
  // currentPassword is sent as it was typed, including empty for an account setting its first
  // password — the server decides whether it needs verifying, from whether a hash exists. Dropping
  // the field for a user who does have a password would read on the server as a wrong password
  // rather than a missing one, which is the same refusal with a worse message.
  await apiFetch("/api/users/me/password", { method: "PATCH", body: JSON.stringify(input) })
}
