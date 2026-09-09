export type AuthAction = "login" | "register"

const messages: Partial<Record<AuthAction, Record<string, string>>> = {
  login: {
    INVALID_CREDENTIALS: "Email or password is incorrect",
    VALIDATION_FAILED: "Check the highlighted fields",
    GoogleSignInFailed: "Google sign-in didn't work. Please try again.",
    OAuthSignin: "Google sign-in isn't available right now.",
    OAuthCallback: "Google sign-in didn't work. Please try again.",
  },
  register: {
    EMAIL_ALREADY_REGISTERED: "That email already has an account",
    VALIDATION_FAILED: "Check the highlighted fields",
  },
}

export function authErrorCopy(action: AuthAction, code: string | null | undefined) {
  return (code && messages[action]?.[code]) || "BlindPulse is unavailable right now. Please try again."
}
