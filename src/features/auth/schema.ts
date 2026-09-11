import { z } from "zod"

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number")
  .regex(/[^A-Za-z0-9]/, "Password must contain a symbol")

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  password: z.string().min(1, "Password is required").max(128),
})

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  password: passwordSchema,
})

// The BFF's shape for PATCH /users/me/password, mirroring the server's own request type.
//
// currentPassword is optional here on purpose: an account created through Google has no password
// yet, and that call sets its first one rather than changing one. The server skips verification
// exactly when no hash exists and verifies it whenever one does, so requiring it at this boundary
// would block the first-time case without protecting the other. The settings form requires it when
// the account has a password — see `changePasswordFormSchema`.
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().max(128).optional(),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password").max(128),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match",
  })

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
