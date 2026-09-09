"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react"

type Theme = "dark" | "light"

const STORAGE_KEY = "blindpulse.theme"

// The stored preference is external state, not React state: it lives in localStorage, another tab
// can change it, and reading it during render must be stable. useSyncExternalStore is the shape
// React provides for exactly that, and it avoids the cascading render a setState-in-effect causes.
// The snapshot is cached because getSnapshot must return an identical value until it truly
// changes — reading localStorage on every call would return a fresh string and loop forever.
let cachedTheme: Theme | null = null
const listeners = new Set<() => void>()

function readStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === "light" ? "light" : "dark"
  } catch {
    // Private browsing and blocked site data both throw. Dark is the product's default, so
    // failing to read a preference is not an error state.
    return "dark"
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Another tab writing the preference fires `storage` here; a write in this tab notifies
  // directly, because `storage` deliberately does not fire in the tab that caused it.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cachedTheme = null
      listener()
    }
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

function getSnapshot(): Theme {
  if (cachedTheme === null) cachedTheme = readStoredTheme()
  return cachedTheme
}

// Dark is what the server renders (the <html> class is hardcoded), so hydration starts there and
// React re-renders once the real preference is known.
function getServerSnapshot(): Theme {
  return "dark"
}

const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void }>({
  theme: "dark",
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // Writing the class onto <html> is the effect's proper job: synchronizing an external system
  // with React state, rather than feeding state back into React.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    cachedTheme = next
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // A preference that cannot be persisted still applies for this session.
    }
    for (const listener of listeners) listener()
  }, [])

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
