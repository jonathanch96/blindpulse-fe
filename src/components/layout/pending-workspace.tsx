import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// An honest placeholder. A workspace that is not built yet says which sprint builds it and what
// it is waiting on, rather than showing a plausible screen full of invented numbers — mock data in
// a trading tool is indistinguishable from real data until someone acts on it.
export function PendingWorkspace({
  title,
  summary,
  sprint,
  dependencies,
}: {
  title: string
  summary: string
  sprint: string
  dependencies: string[]
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="space-y-1">
        <p className="label-caps text-muted-foreground">{sprint}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{summary}</p>
      </div>
      <Card className="rounded-sm border-seam bg-panel">
        <CardHeader>
          <CardTitle className="label-caps text-muted-foreground">Blocked on</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {dependencies.map((dependency) => (
              <li key={dependency} className="flex items-center gap-2 text-sm">
                <span className="size-1.5 rounded-full bg-telemetry" aria-hidden="true" />
                {dependency}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
