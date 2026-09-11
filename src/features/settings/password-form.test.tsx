import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { PasswordForm } from "@/features/settings/components/password-form"
import type { CurrentUser } from "@/features/settings/types"
import { ApiError, type Envelope } from "@/lib/envelope"

const changePassword = vi.hoisted(() => vi.fn())
vi.mock("@/features/settings/api", () => ({ changePassword }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function user(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: "4f0b2d1a-7c58-4a9e-9b31-2e6a8c5d0f77",
    email: "trader@example.com",
    name: "Trader",
    avatarUrl: null,
    hasAccount: true,
    hasLoggedIn: true,
    hasPassword: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

function Harness({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function envelope(code: string, message: string): Envelope<unknown> {
  return { success: false, code, message, data: null, meta: {}, errors: [], traceId: "t", timestamp: "2026-01-01T00:00:00Z" }
}

describe("PasswordForm", () => {
  afterEach(() => {
    cleanup()
    changePassword.mockReset()
  })

  it("asks for the current password when the account has one", () => {
    render(<Harness><PasswordForm user={user()} /></Harness>)
    expect(screen.getByLabelText("Current password")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Change password" })).toBeTruthy()
  })

  // The reason `has_password` exists on the wire. A Google-only account has never had a password, so
  // a "current password" field is a question with no answer: the form would be unsubmittable and
  // nothing on screen would explain why.
  it("offers to set a first password, with no current-password field, for a Google-only account", () => {
    render(<Harness><PasswordForm user={user({ hasPassword: false })} /></Harness>)
    expect(screen.queryByLabelText("Current password")).toBeNull()
    expect(screen.getByRole("button", { name: "Set password" })).toBeTruthy()
  })

  it("sends the typed values once the form is valid", async () => {
    changePassword.mockResolvedValue(undefined)
    render(<Harness><PasswordForm user={user()} /></Harness>)

    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "Original!1" } })
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "Str0ng!Passw0rd" } })
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "Str0ng!Passw0rd" } })
    fireEvent.click(screen.getByRole("button", { name: "Change password" }))

    await waitFor(() => expect(changePassword).toHaveBeenCalledWith({
      currentPassword: "Original!1",
      newPassword: "Str0ng!Passw0rd",
      confirmPassword: "Str0ng!Passw0rd",
    }))
  })

  // A wrong current password reported at the top of the card, away from the field it is about, is
  // the generic-error failure the gate work kept objecting to in a different part of the product.
  it("attaches INVALID_CURRENT_PASSWORD to the field it is about", async () => {
    changePassword.mockRejectedValue(new ApiError(envelope("INVALID_CURRENT_PASSWORD", "Current password is incorrect"), 400))
    render(<Harness><PasswordForm user={user()} /></Harness>)

    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "WrongOne!1" } })
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "Str0ng!Passw0rd" } })
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "Str0ng!Passw0rd" } })
    fireEvent.click(screen.getByRole("button", { name: "Change password" }))

    const message = await screen.findByText("Current password is incorrect")
    const field = screen.getByLabelText("Current password")
    expect(field.getAttribute("aria-describedby")).toContain(message.id)
    expect(field.getAttribute("aria-invalid")).toBe("true")
  })
})
