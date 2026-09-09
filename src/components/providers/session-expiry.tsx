"use client"

import { useEffect, useRef } from "react"
import { signOut, useSession } from "next-auth/react"
import { toast } from "sonner"

export function SessionExpiry() {
  const { data } = useSession()
  const handled = useRef(false)
  useEffect(() => {
    if (data?.error !== "RefreshFailed" || handled.current) return
    handled.current = true
    toast.error("Your session expired, please sign in")
    void signOut({ callbackUrl: "/login" })
  }, [data?.error])
  return null
}
