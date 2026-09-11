import type { Metadata } from "next"

import { SettingsPage } from "@/features/settings/settings-page"

export const metadata: Metadata = { title: "Account Settings" }

export default function Settings() {
  return <SettingsPage />
}
