import { BarChart3, LineChart, Notebook, Radar, Settings, Wallet } from "lucide-react"

// One source of truth for the four workspaces, shared by the top bar, the desktop rail, and the
// mobile bottom bar — three navigations that drift apart the moment they each keep their own list.
export const workspaces = [
  { href: "/terminal", label: "Replay Terminal", short: "Terminal", icon: LineChart },
  { href: "/feeds", label: "Blinded Feeds", short: "Feeds", icon: Radar },
  { href: "/journal", label: "Trade Journal", short: "Journal", icon: Notebook },
  { href: "/accounts", label: "Accounts & Resets", short: "Accounts", icon: Wallet },
  { href: "/analytics", label: "Performance Analytics", short: "Analytics", icon: BarChart3 },
] as const

export type Workspace = (typeof workspaces)[number]

// Settings is not a workspace: it is about the person, not the desk, and a sixth tab in a row of
// five trading surfaces reads as one. It is reached from the header at every width and from the
// rail's footer on desktop. The mobile bottom bar stays at five — a sixth target at 390px is 65px
// wide, below the tap size the rest of the mobile work holds to — and the header icon covers it.
export const accountSettings = {
  href: "/settings",
  label: "Account Settings",
  short: "Settings",
  icon: Settings,
} as const
