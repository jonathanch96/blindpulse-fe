import { describe, expect, it } from "vitest"

import { authErrorCopy } from "@/features/auth/error-copy"

describe("authErrorCopy", () => {
  it("maps expected catalog codes", () => {
    expect(authErrorCopy("login", "INVALID_CREDENTIALS")).toBe("Email or password is incorrect")
    expect(authErrorCopy("register", "EMAIL_ALREADY_REGISTERED")).toBe("That email already has an account")
    expect(authErrorCopy("login", "VALIDATION_FAILED")).toBe("Check the highlighted fields")
  })

  it("does not disguise infrastructure failures as bad credentials", () => {
    expect(authErrorCopy("login", "INTERNAL_ERROR")).toBe("BlindPulse is unavailable right now. Please try again.")
    expect(authErrorCopy("register", undefined)).toBe("BlindPulse is unavailable right now. Please try again.")
  })
})
