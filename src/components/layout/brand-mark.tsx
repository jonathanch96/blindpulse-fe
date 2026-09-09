import { cn } from "@/lib/utils"

// A masked pulse: the waveform is there, the identity is not. Drawn rather than imported so it
// inherits the current theme's primary instead of shipping two PNGs.
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn("relative inline-flex size-7 shrink-0 items-center justify-center rounded-[3px] bg-primary", className)}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="size-5 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 13h3.2l2.1-6 3 12 2.4-8 1.8 4H22" />
      </svg>
    </span>
  )
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-baseline gap-2", className)}>
      <span className="text-base font-semibold tracking-tight">BlindPulse</span>
      <span className="label-caps text-muted-foreground">Replay Lab</span>
    </span>
  )
}
