"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { workspaces } from "@/components/layout/nav-items"
import { cn } from "@/lib/utils"

export function MobileAppNav() {
  const pathname = usePathname()

  return (
    <nav
      className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-seam bg-panel lg:hidden"
      aria-label="Workspaces"
    >
      {workspaces.map((workspace) => {
        const active = pathname.startsWith(workspace.href)
        const Icon = workspace.icon
        return (
          <Link
            key={workspace.href}
            href={workspace.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 pt-2",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            <span className="label-caps">{workspace.short}</span>
          </Link>
        )
      })}
    </nav>
  )
}
