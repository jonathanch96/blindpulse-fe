"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { openAccount } from "@/features/account/api"
import { openAccountSchema, type OpenAccountInput } from "@/features/account/schema"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiErrorMessage } from "@/lib/envelope"
import { qk } from "@/lib/query-keys"

export function OpenAccountDialog() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const form = useForm<OpenAccountInput>({
    resolver: zodResolver(openAccountSchema),
    defaultValues: {
      name: "",
      strategyProfile: "",
      currency: "USD",
      initialBalance: "10000",
      // Defaults mirror the platform gates the server applies, so the form shows the rules the
      // order gate will actually enforce rather than blank fields the trader has to guess at.
      risk: { riskPerTradePct: "1", maxDailyDrawdownPct: "5", minRiskReward: "2", maxOpenPositions: 5 },
    },
  })

  const mutation = useMutation({
    mutationFn: openAccount,
    onSuccess: async (account) => {
      await queryClient.invalidateQueries({ queryKey: qk.accounts() })
      toast.success(`${account?.name ?? "Account"} opened`)
      form.reset()
      setOpen(false)
    },
    onError: (error) => form.setError("root", { message: apiErrorMessage(error, "Unable to open the account") }),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-1.5 rounded-sm">
            <Plus className="size-4" aria-hidden="true" />
            Create sub-account / challenge
          </Button>
        }
      />
      <DialogContent className="rounded-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Open a replay portfolio</DialogTitle>
          <DialogDescription>
            This becomes iteration 01 of a new reset tree. Later resets fork beside it; nothing here is ever
            overwritten.
          </DialogDescription>
        </DialogHeader>
        <form method="post" className="space-y-4" onSubmit={form.handleSubmit((value) => mutation.mutate(value))}>
          <div className="space-y-1.5">
            <Label htmlFor="account-name">Account name</Label>
            <Input id="account-name" placeholder="Demo ACC #04 — Swing Replay" {...form.register("name")} />
            <FieldError message={form.formState.errors.name?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="account-strategy">Strategy profile</Label>
            <Input id="account-strategy" placeholder="Swing Replay (Liquidity Sweep)" {...form.register("strategyProfile")} />
            <p className="text-xs text-muted-foreground">
              What you intend to trade on this branch. The post-mortem compares your trades against it.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="account-balance">Starting equity</Label>
              <Input id="account-balance" inputMode="decimal" className="metric" {...form.register("initialBalance")} />
              <FieldError message={form.formState.errors.initialBalance?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-currency">Currency</Label>
              <Input id="account-currency" className="metric uppercase" maxLength={3} {...form.register("currency")} />
              <FieldError message={form.formState.errors.currency?.message} />
            </div>
          </div>
          <fieldset className="grid grid-cols-2 gap-3 border border-seam p-3">
            <legend className="label-caps px-1 text-muted-foreground">Risk gates</legend>
            <div className="space-y-1.5">
              <Label htmlFor="account-risk">Risk per trade %</Label>
              <Input id="account-risk" inputMode="decimal" className="metric" {...form.register("risk.riskPerTradePct")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-drawdown">Max daily drawdown %</Label>
              <Input id="account-drawdown" inputMode="decimal" className="metric" {...form.register("risk.maxDailyDrawdownPct")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-rr">Minimum R:R</Label>
              <Input id="account-rr" inputMode="decimal" className="metric" {...form.register("risk.minRiskReward")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-positions">Max open positions</Label>
              <Input
                id="account-positions"
                inputMode="numeric"
                className="metric"
                {...form.register("risk.maxOpenPositions", { valueAsNumber: true })}
              />
            </div>
          </fieldset>
          <FieldError message={form.formState.errors.root?.message} />
          <DialogFooter>
            <Button type="submit" className="rounded-sm" disabled={mutation.isPending}>
              {mutation.isPending ? "Opening…" : "Open account"}
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
