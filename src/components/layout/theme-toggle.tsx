"use client"

import { Moon, Sun } from "lucide-react"

import { useTheme } from "@/components/providers/theme-provider"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const next = theme === "dark" ? "light" : "dark"
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 gap-1.5 rounded-sm px-2"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
    >
      {theme === "dark" ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
      <span className="label-caps">{theme === "dark" ? "Dark" : "Light"}</span>
    </Button>
  )
}
