import { describe, expect, it } from "vitest"

import { registrationDestination } from "@/features/auth/register-form"

describe("registrationDestination", () => {
  // A new account owns no replay portfolio, and the terminal cannot do anything without one, so
  // registration must land where the first account gets opened.
  it("lands on accounts rather than the terminal or the marketing page", () => {
    expect(registrationDestination()).toBe("/accounts")
  })
})
