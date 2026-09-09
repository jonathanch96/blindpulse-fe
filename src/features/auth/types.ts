export type AuthUser = {
  id: string
  email: string
  name: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type BackendSession = {
  user: AuthUser
  access_token: string
  refresh_token: string
  access_token_expires_at: string
  refresh_token_expires_at: string
}
