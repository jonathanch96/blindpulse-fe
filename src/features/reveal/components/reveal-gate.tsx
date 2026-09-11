"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Eye, Lock } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { revealSession } from "@/features/reveal/api"
import type { ReplaySession } from "@/features/session/types"
import { apiErrorMessage } from "@/lib/envelope"
import { qk } from "@/lib/query-keys"

/**
 * The reveal trigger.
 *
 * Two decisions worth not losing:
 *
 * Before the session closes the control is **disabled with the reason stated**, not hidden. A
 * missing control reads as a missing feature; a disabled one that says why teaches the rule, which
 * is the same argument the order gate makes about returning a specific code per check.
 *
 * The confirmation says plainly that it cannot be undone. This is the only action in the product
 * with no recovery — once a trader has seen the ticker they cannot un-see it — so it is the one
 * place a confirm is not training people to click through confirms.
 */
export function RevealGate({ session }: { session: ReplaySession }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const closed = session.status === "closed" || session.status === "abandoned"

  const reveal = useMutation({
    mutationFn: () => revealSession(session.id),
    onSuccess: async () => {
      // Invalidate rather than write through: the screen transitions on the reveal query, and
      // seeding it by hand would put the disclosure on screen before the server had confirmed it.
      await queryClient.invalidateQueries({ queryKey: qk.sessionReveal(session.id) })
      await queryClient.invalidateQueries({ queryKey: qk.session(session.id) })
      setOpen(false)
      toast.success("Unblinded")
    },
    onError: (error) => toast.error(apiErrorMessage(error, "The reveal was refused")),
  })

  return (
    <>
      <div className="flex flex-col items-start gap-1.5">
        <Button
          type="button"
          className="gap-2 rounded-sm font-semibold"
          disabled={!closed || reveal.isPending}
          onClick={() => setOpen(true)}
        >
          {closed ? <Eye className="size-4" aria-hidden="true" /> : <Lock className="size-4" aria-hidden="true" />}
          Reveal the asset
        </Button>
        {closed ? null : (
          <p className="text-xs text-muted-foreground">
            Unlocks when the session is closed. Revealing now would hand you the answer with bars still to trade.
          </p>
        )}
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="rounded-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Unblind this session?</AlertDialogTitle>
            <AlertDialogDescription>
              This shows the real ticker, the real dates and what the market did next.{" "}
              <strong className="text-foreground">It cannot be undone</strong>, and the session cannot be traded
              further. If you want another attempt at this setup, randomize a new feed instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reveal.isPending}>Keep it blinded</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                // The dialog would close on click; the mutation decides when, so a failure leaves
                // the trader looking at the confirmation and the toast rather than at nothing.
                event.preventDefault()
                reveal.mutate()
              }}
              disabled={reveal.isPending}
            >
              {reveal.isPending ? "Unblinding…" : "Reveal"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
