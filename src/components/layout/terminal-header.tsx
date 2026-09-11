"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { BlindModeChip } from "@/components/layout/blind-mode-chip"
import { BrandMark, BrandWordmark } from "@/components/layout/brand-mark"
import { accountSettings, workspaces } from "@/components/layout/nav-items"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { cn } from "@/lib/utils"

export function TerminalHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b border-seam bg-panel">
      <div className="flex h-12 items-center gap-4 px-3">
        <Link href="/terminal" className="flex items-center gap-2">
          <BrandMark />
          <BrandWordmark className="hidden sm:flex" />
        </Link>

        <nav className="hidden items-center lg:flex" aria-label="Workspaces">
          {workspaces.map((workspace) => {
            const active = pathname.startsWith(workspace.href)
            return (
              <Link
                key={workspace.href}
                href={workspace.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  // The active tab is marked by a solid rule, not a pill: a rounded chip in a
                  // hairline grid reads as a floating object rather than a selected pane.
                  "border-b-2 px-3 py-3.5 text-[13px] transition-colors",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {workspace.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <BlindModeChip blinded className="hidden md:inline-flex" />
          {/* The only route to the account at mobile widths, so it is an icon in the bar rather than
              a sixth item in the bottom nav. Labelled, because a bare gear is a guess. */}
          <Link
            href={accountSettings.href}
            aria-label={accountSettings.label}
            aria-current={pathname.startsWith(accountSettings.href) ? "page" : undefined}
            className={cn(
              "p-1.5 transition-colors",
              pathname.startsWith(accountSettings.href) ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <accountSettings.icon className="size-4" aria-hidden="true" />
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
