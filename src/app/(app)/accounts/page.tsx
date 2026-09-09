import type { Metadata } from "next"

import { AccountsPage } from "@/features/account/accounts-page"

export const metadata: Metadata = { title: "Accounts & Resets" }

export default function Accounts() {
  return <AccountsPage />
}
