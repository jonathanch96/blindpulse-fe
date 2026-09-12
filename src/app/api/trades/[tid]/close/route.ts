import type { NextRequest } from "next/server"

import { closePositionSchema } from "@/features/execution/schema"
import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

type Context = { params: Promise<{ tid: string }> }

// The body is optional, as it is on the server: no body means close the whole position, and a dock
// should not have to send {"fraction":"1"} to say the obvious thing. `.optional()` is what lets an
// absent body through validation rather than failing it as a missing object.
export async function POST(request: NextRequest, { params }: Context) {
  const { tid } = await params
  return authenticatedProxy(request, `/trades/${encodeURIComponent(tid)}/close`, closePositionSchema.optional())
}
