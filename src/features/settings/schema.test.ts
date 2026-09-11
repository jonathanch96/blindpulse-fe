import { describe, expect, it } from "vitest"

import { changePasswordFormSchema, profileSchema } from "@/features/settings/schema"

describe("profile schema", () => {
  it("trims the name and refuses one made of spaces", () => {
    const parsed = profileSchema.safeParse({ name: "  Trader  ", avatarUrl: "" })
    expect(parsed.success && parsed.data.name).toBe("Trader")
    expect(profileSchema.safeParse({ name: "   ", avatarUrl: "" }).success).toBe(false)
  })

  // Blank is how the avatar is removed, so it has to be valid input. A URL rule applied to the
  // empty string would make "take my picture off" unexpressible, and the server has no other way
  // to hear it.
  it("accepts a blank avatar URL as a removal but still rejects a malformed one", () => {
    expect(profileSchema.safeParse({ name: "Trader", avatarUrl: "" }).success).toBe(true)
    expect(profileSchema.safeParse({ name: "Trader", avatarUrl: "   " }).success).toBe(true)
    expect(profileSchema.safeParse({ name: "Trader", avatarUrl: "https://cdn.example.com/a.png" }).success).toBe(true)
    expect(profileSchema.safeParse({ name: "Trader", avatarUrl: "not-a-url" }).success).toBe(false)
  })
})

describe("change password schema", () => {
  const strong = "Str0ng!Passw0rd"

  it("requires the current password when the account has one", () => {
    const schema = changePasswordFormSchema(true)
    expect(schema.safeParse({ currentPassword: "", newPassword: strong, confirmPassword: strong }).success).toBe(false)
    expect(schema.safeParse({ currentPassword: "Original!1", newPassword: strong, confirmPassword: strong }).success).toBe(true)
  })

  // The branch that made this screen impossible to build before: an account created through Google
  // has no password to quote back. The server skips verification in exactly this case, so a form
  // that demanded it would be asking for something that has never existed.
  it("accepts an empty current password when the account has none", () => {
    const schema = changePasswordFormSchema(false)
    expect(schema.safeParse({ currentPassword: "", newPassword: strong, confirmPassword: strong }).success).toBe(true)
  })

  it("refuses a mismatched confirmation, and says so on the confirmation field", () => {
    const result = changePasswordFormSchema(true).safeParse({
      currentPassword: "Original!1",
      newPassword: strong,
      confirmPassword: "Str0ng!Passw0rdd",
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toContain("confirmPassword")
  })

  it("refuses reusing the current password as the new one", () => {
    const result = changePasswordFormSchema(true).safeParse({
      currentPassword: strong,
      newPassword: strong,
      confirmPassword: strong,
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toContain("newPassword")
  })

  it("applies the same strength policy as registration", () => {
    const weak = "password"
    const result = changePasswordFormSchema(false).safeParse({
      currentPassword: "",
      newPassword: weak,
      confirmPassword: weak,
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toContain("newPassword")
  })
})
