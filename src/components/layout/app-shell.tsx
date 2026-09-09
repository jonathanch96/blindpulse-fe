"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

import { MobileAppNav } from "@/components/layout/mobile-app-nav"
import { TerminalHeader } from "@/components/layout/terminal-header"
import { WorkspaceRail } from "@/components/layout/workspace-rail"

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  // The terminal is a full-bleed docking grid: it manages its own panes edge to edge, so the
  // shell gives it the whole viewport rather than a padded content column.
  const fullBleed = pathname.startsWith("/terminal")

  return (
    <>
      <TerminalHeader />
      <div className="flex flex-1">
        <WorkspaceRail />
        <main className={fullBleed ? "min-w-0 flex-1" : "min-w-0 flex-1 px-4 pt-5 pb-24 md:px-6 md:py-6 lg:pb-6"}>
          {children}
        </main>
      </div>
      <MobileAppNav />
    </>
  )
}
