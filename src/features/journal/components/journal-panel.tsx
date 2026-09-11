"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { NotebookPen } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { fetchJournal, writeJournalEntry } from "@/features/journal/api"
import { emotionLabels, emotions, type Emotion } from "@/features/journal/types"
import { apiErrorMessage } from "@/lib/envelope"
import { qk } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

/**
 * Journal capture, inline in the terminal.
 *
 * It is here rather than on a separate screen because a thesis written after leaving the chart is a
 * thesis written after the fact. The anchor is the session's current bar, taken from the session the
 * server returned — never from a local counter — so what the note claims to be about is what the
 * server agrees the trader was looking at.
 */
export function JournalPanel({ sessionId, barIndex }: { sessionId: string; barIndex: number }) {
  const queryClient = useQueryClient()
  const [thesis, setThesis] = useState("")
  const [emotion, setEmotion] = useState<Emotion | null>(null)
  const [conviction, setConviction] = useState<number | null>(null)

  const { data: entries } = useQuery({ queryKey: qk.journal(sessionId), queryFn: () => fetchJournal(sessionId) })

  const write = useMutation({
    mutationFn: () =>
      writeJournalEntry(sessionId, {
        barIndex,
        thesis: thesis.trim() || undefined,
        emotion: emotion ?? undefined,
        conviction: conviction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.journal(sessionId) })
      toast.success(`Noted at bar ${barIndex + 1}`)
      setThesis("")
      setEmotion(null)
      setConviction(null)
    },
    onError: (error) => toast.error(apiErrorMessage(error, "That note was refused")),
  })

  // Empty is what the server refuses, so the button says so before the round trip rather than after.
  const empty = thesis.trim() === "" && emotion === null && conviction === null

  return (
    <section className="flex min-h-0 flex-col border-l border-seam bg-panel" aria-label="Journal">
      <div className="flex items-center gap-2 border-b border-seam px-3 py-1.5">
        <NotebookPen className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <p className="label-caps text-muted-foreground">Journal</p>
        {/* Counted from one, matching the transport's readout. The bar the note will anchor to is
            stated because it is the one thing about a journal entry that cannot be changed later. */}
        <span className="metric ml-auto text-[11px] text-muted-foreground">bar {barIndex + 1}</span>
      </div>

      <div className="space-y-2 border-b border-seam p-3">
        <Textarea
          aria-label="Thesis"
          value={thesis}
          onChange={(event) => setThesis(event.target.value)}
          placeholder="What do you see, and what would prove you wrong?"
          rows={3}
          className="resize-none rounded-sm text-[13px]"
        />

        <fieldset className="flex flex-wrap gap-1">
          <legend className="label-caps mb-1 text-muted-foreground">Feeling</legend>
          {emotions.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={emotion === value}
              onClick={() => setEmotion(emotion === value ? null : value)}
              className={cn(
                "border px-1.5 py-0.5 text-[11px] transition-colors",
                emotion === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-seam text-muted-foreground hover:text-foreground",
              )}
            >
              {emotionLabels[value]}
            </button>
          ))}
        </fieldset>

        <fieldset className="flex items-center gap-1">
          <legend className="label-caps mb-1 text-muted-foreground">Conviction</legend>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`Conviction ${value}`}
              aria-pressed={conviction === value}
              onClick={() => setConviction(conviction === value ? null : value)}
              className={cn(
                "metric size-6 border text-[11px] transition-colors",
                conviction === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-seam text-muted-foreground hover:text-foreground",
              )}
            >
              {value}
            </button>
          ))}
        </fieldset>

        <Button
          type="button"
          size="sm"
          className="h-7 w-full rounded-sm"
          disabled={empty || write.isPending}
          onClick={() => write.mutate()}
        >
          {write.isPending ? "Saving…" : `Note bar ${barIndex + 1}`}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {entries && entries.length > 0 ? (
          <ul className="divide-y divide-seam">
            {entries.map((entry) => (
              <li key={entry.id} className="space-y-1 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="metric text-[11px] text-primary">bar {entry.barIndex + 1}</span>
                  {entry.emotion ? (
                    <span className="label-caps text-muted-foreground">{emotionLabels[entry.emotion]}</span>
                  ) : null}
                  {entry.conviction ? (
                    <span className="metric text-[11px] text-muted-foreground">conviction {entry.conviction}/5</span>
                  ) : null}
                </div>
                {entry.thesis ? <p className="text-[13px] leading-snug">{entry.thesis}</p> : null}
                {entry.note ? <p className="text-[13px] leading-snug text-muted-foreground">{entry.note}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-3 py-4 text-[13px] text-muted-foreground">
            Nothing yet. A thesis written while the outcome is unknown is the only kind worth reading afterwards.
          </p>
        )}
      </div>
    </section>
  )
}
