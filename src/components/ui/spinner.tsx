import { cn } from "@/lib/utils"
import { Loader2Icon } from "lucide-react"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon data-slot="spinner" role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} {...props} />
  )
}

// A full-section placeholder for queries that are still loading, used instead of bare text so
// every async view in the app gets the same visual treatment.
function LoadingState({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 py-10 text-sm text-muted-foreground", className)}>
      <Spinner />
      {label}
    </div>
  )
}

export { Spinner, LoadingState }
