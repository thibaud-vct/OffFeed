import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Routes where same-origin enforcement is REQUIRED for state-changing methods.
// /api/auth/* is excluded — NextAuth has its own CSRF tokens.
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin")
  const referer = req.headers.get("referer")
  const host = req.headers.get("host")
  if (!host) return false

  // The expected origin = scheme + host. We trust the request's own host header
  // because Next.js already validates it server-side.
  const proto = req.headers.get("x-forwarded-proto") || "https"
  const expected = `${proto}://${host}`

  if (origin) return origin === expected
  if (referer) {
    try { return new URL(referer).origin === expected } catch { return false }
  }
  // No Origin and no Referer on a mutation = suspicious (most browsers send one)
  return false
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ---- CSRF / cross-origin defense for our own mutation endpoints
  if (
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth/") &&
    MUTATING_METHODS.has(req.method)
  ) {
    if (!isSameOrigin(req)) {
      return new NextResponse("Forbidden: cross-origin request", { status: 403 })
    }
  }

  // ---- Security headers (defense-in-depth)
  const res = NextResponse.next()
  const h = res.headers
  h.set("X-Frame-Options", "DENY")
  h.set("X-Content-Type-Options", "nosniff")
  h.set("Referrer-Policy", "strict-origin-when-cross-origin")
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()")
  h.set("X-DNS-Prefetch-Control", "off")
  // Content-Security-Policy — 'unsafe-inline' required by Next.js internals
  h.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires these
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.cdninstagram.com https://scontent*.fbcdn.net",
      "connect-src 'self'",
      "font-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  )
  // Strict-Transport-Security only meaningful over HTTPS
  if (process.env.NODE_ENV === "production") {
    h.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
  }
  // Prevent the login page from being indexed
  if (pathname.startsWith("/admin")) {
    h.set("X-Robots-Tag", "noindex, nofollow")
  }
  return res
}

export const config = {
  // Run on everything except static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads/).*)"],
}
