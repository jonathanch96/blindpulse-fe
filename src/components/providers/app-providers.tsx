"use client"

import type { ReactNode } from "react"
import { SessionProvider } from "next-auth/react"

import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryProvider } from "@/components/providers/query-provider"
import { SessionExpiry } from "@/components/providers/session-expiry"
import { ThemeProvider } from "@/components/providers/theme-provider"

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SessionExpiry />
      <ThemeProvider>
        <QueryProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </QueryProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
