import { BarChart3, LineChart, Notebook, Radar, Wallet } from "lucide-react"

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
