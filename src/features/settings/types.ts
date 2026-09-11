// The camelized shape of GET /api/users/me. Distinct from `AuthUser` in features/auth, which is the
// raw snake_case payload NextAuth stores in the session cookie — that one is a transport detail of
// sign-in, this one is what a screen renders.
export type CurrentUser = {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  hasAccount: boolean
  hasLoggedIn: boolean
  // True when there is a password to change, false for an account that signed up through Google and
  // is setting its first one. The form asks for the current password only in the first case; asking
  // in the second demands a credential that has never existed.
  hasPassword: boolean
  createdAt: string
  updatedAt: string
}
