import { z } from "zod"

import { passwordSchema } from "@/features/auth/schema"

// The name the server will accept, with the same bound. Trimmed here so a name of spaces fails the
// minimum rather than arriving as a blank display name.
export const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  // Blank is meaningful: it clears the avatar. An empty string is therefore valid input, and the URL
  // rule only applies once something has been typed — z.url() on a blank field would reject the very
  // act of removing a picture.
  avatarUrl: z
    .string()
    .trim()
    .max(2048)
    .refine((value) => value === "" || z.url().safeParse(value).success, "Enter a valid URL, or leave it empty"),
})

export type ProfileInput = z.infer<typeof profileSchema>

// One shape whether or not the account has a password, so the form's field names and types don't
// change underneath the resolver. What varies is whether currentPassword may be empty, and that is
// applied below.
const changePasswordFields = z.object({
  currentPassword: z.string().max(128),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, "Confirm your new password").max(128),
})

export type ChangePasswordFormInput = z.infer<typeof changePasswordFields>

/**
 * The form's password rules, which depend on the account.
 *
 * An account with a password must prove it knows the current one; an account created through Google
 * is setting its first password and has none to prove. The server draws the same distinction, from
 * whether a hash exists, so this mirrors a server rule rather than inventing a client-side one — and
 * a form that demanded a current password from a Google-only user would be unanswerable.
 */
export function changePasswordFormSchema(hasPassword: boolean) {
  return changePasswordFields
    .refine((value) => !hasPassword || value.currentPassword.length > 0, {
      path: ["currentPassword"],
      message: "Your current password is required",
    })
    .refine((value) => value.newPassword === value.confirmPassword, {
      path: ["confirmPassword"],
      message: "Passwords must match",
    })
    .refine((value) => !hasPassword || value.currentPassword !== value.newPassword, {
      path: ["newPassword"],
      message: "The new password must differ from the current one",
    })
}
