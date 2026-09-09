import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-16" aria-label="Loading"><Skeleton className="h-12 w-2/3" /><Skeleton className="h-40 w-full" /></main>
}

