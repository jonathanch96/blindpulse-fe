import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export async function proxy(request: NextRequest) {
  const session = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (session) return NextResponse.next()
  const login = new URL("/login", request.url)
  login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`)
  return NextResponse.redirect(login)
}

export const config = {
  matcher: ["/terminal/:path*", "/feeds/:path*", "/journal/:path*", "/accounts/:path*", "/analytics/:path*"],
}
