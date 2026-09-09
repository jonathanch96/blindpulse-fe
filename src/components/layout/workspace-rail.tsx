"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { workspaces } from "@/components/layout/nav-items"
import { cn } from "@/lib/utils"

// The institutional left rail. Hidden below lg, where the top bar's tabs and the mobile bottom
// bar carry the same four destinations.
export function WorkspaceRail() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-56 shrink-0 border-r border-seam bg-panel lg:block">
      <p className="label-caps px-3 py-3 text-muted-foreground">Institutional tools</p>
      <nav className="flex flex-col" aria-label="Workspaces">
        {workspaces.map((workspace) => {
          const active = pathname.startsWith(workspace.href)
          const Icon = workspace.icon
          return (
            <Link
              key={workspace.href}
              href={workspace.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 border-l-2 px-3 py-2 text-[13px] transition-colors",
                active
                  ? "border-primary bg-panel-raised text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-panel-raised hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {workspace.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
