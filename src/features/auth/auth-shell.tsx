import type { ReactNode } from "react"
import Link from "next/link"

import { BrandMark } from "@/components/layout/brand-mark"

export function AuthShell({ title, description, alternate, children }: {
  title: string
  description: string
  alternate: ReactNode
  children: ReactNode
}) {
  return (
    <main className="flex min-h-dvh flex-col bg-background lg:grid lg:grid-cols-[minmax(320px,44%)_1fr]">
      <div className="relative flex min-h-[240px] flex-col justify-between overflow-hidden border-b border-seam bg-panel p-6 lg:min-h-0 lg:border-r lg:border-b-0 lg:p-14">
        {/* A masked tape rather than a decorative blob: the panel behind the sign-in is the same
            instrument surface as the terminal, dimmed. */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, var(--seam-strong) 0 1px, transparent 1px 48px), repeating-linear-gradient(0deg, var(--seam-strong) 0 1px, transparent 1px 32px)",
          }}
          aria-hidden="true"
        />
        <Link href="/" className="relative flex items-center gap-2.5">
          <BrandMark />
          <span className="text-lg font-semibold tracking-tight">BlindPulse</span>
          <span className="label-caps text-muted-foreground">Replay Lab</span>
        </Link>
        <div className="relative max-w-[420px]">
          <h1 className="text-[30px] leading-[1.15] font-semibold tracking-tight lg:text-[38px]">
            Trade the chart.
            <br />
            Not the hindsight.
          </h1>
          <p className="mt-3 hidden text-sm leading-relaxed text-muted-foreground sm:block lg:mt-4">
            The ticker, the date and the headlines stay masked until you close the session. What is left is the only
            thing that transfers to a live account: your process.
          </p>
        </div>
        <p className="metric relative hidden text-xs text-muted-foreground lg:block">
          © {new Date().getFullYear()} BlindPulse Replay Lab
        </p>
      </div>
      <div className="flex w-full flex-1 items-start justify-center px-6 py-9 lg:items-center lg:py-12">
        <div className="w-full max-w-[380px]">
          <h2 className="text-[24px] font-semibold tracking-tight">{title}</h2>
          <p className="mt-1.5 mb-7 text-sm text-muted-foreground">{description}</p>
          {children}
          <p className="mt-5 text-center text-sm text-muted-foreground">{alternate}</p>
        </div>
      </div>
    </main>
  )
}
