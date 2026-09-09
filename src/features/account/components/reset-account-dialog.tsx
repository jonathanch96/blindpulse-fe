"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { RotateCcw } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { resetAccount } from "@/features/account/api"
import { resetAccountSchema, type ResetAccountInput } from "@/features/account/schema"
import type { Account } from "@/features/account/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { apiErrorMessage } from "@/lib/envelope"
import { formatMoney } from "@/lib/format"
import { qk } from "@/lib/query-keys"

export function ResetAccountDialog({ account }: { account: Account }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const form = useForm<ResetAccountInput>({
    resolver: zodResolver(resetAccountSchema),
    defaultValues: { reason: "", name: "", strategyProfile: "", initialBalance: account.initialBalance },
  })

  const mutation = useMutation({
    mutationFn: (value: ResetAccountInput) => resetAccount(account.id, value),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: qk.accounts() })
      toast.success(`Iteration ${created?.iterationIndex ?? account.iterationIndex + 1} opened`)
      form.reset()
      setOpen(false)
    },
    onError: (error) => form.setError("root", { message: apiErrorMessage(error, "Unable to reset the account") }),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="destructive" className="gap-1.5 rounded-sm">
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset active balance
          </Button>
        }
      />
      <DialogContent className="rounded-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reset into iteration {account.iterationIndex + 1}</DialogTitle>
          <DialogDescription>
            {/* Stated plainly because the word "reset" everywhere else in trading software means
                "destroy the history". Here it does the opposite, and the trader should know that
                before they click it. */}
            Iteration {account.iterationIndex} is sealed under a chained hash at{" "}
            {formatMoney(account.currentEquity, account.currency)} and stays fully readable — its trades, journal and
            equity curve are preserved. A fresh iteration opens beside it.
          </DialogDescription>
        </DialogHeader>
        <form method="post" className="space-y-4" onSubmit={form.handleSubmit((value) => mutation.mutate(value))}>
          <div className="space-y-1.5">
            <Label htmlFor="reset-reason">Why are you resetting?</Label>
            <Textarea id="reset-reason" rows={2} placeholder="Max drawdown breached on a revenge trade" {...form.register("reason")} />
            <FieldError message={form.formState.errors.reason?.message} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="reset-name">New iteration name</Label>
              <Input id="reset-name" placeholder="(auto)" {...form.register("name")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reset-balance">Starting equity</Label>
              <Input id="reset-balance" inputMode="decimal" className="metric" {...form.register("initialBalance")} />
              <FieldError message={form.formState.errors.initialBalance?.message} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reset-strategy">Strategy profile</Label>
            <Input id="reset-strategy" placeholder={account.strategyProfile ?? "(inherit)"} {...form.register("strategyProfile")} />
          </div>
          <FieldError message={form.formState.errors.root?.message} />
          <DialogFooter>
            <Button type="submit" variant="destructive" className="rounded-sm" disabled={mutation.isPending}>
              {mutation.isPending ? "Forking…" : "Seal and fork"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-bearish">{message}</p>
}
