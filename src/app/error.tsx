"use client"

import { Button } from "@/components/ui/button"

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="grid min-h-[60vh] place-items-center px-4"><div className="max-w-md space-y-4 text-center"><h1 className="text-3xl font-semibold">Something went wrong</h1><p className="text-muted-foreground">The request could not be completed. Try again, or return in a moment.</p><Button onClick={reset}>Try again</Button></div></main>
}

