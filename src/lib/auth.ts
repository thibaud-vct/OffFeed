import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import { verifyPreToken } from "./preToken"
import { verifyToken as verifyTOTP } from "./totp"
import { rateLimit, clientIp } from "./rateLimit"

const secret = process.env.NEXTAUTH_SECRET
if (process.env.NODE_ENV === "production") {
  if (!secret) throw new Error("NEXTAUTH_SECRET is required in production")
  if (secret.length < 32) throw new Error("NEXTAUTH_SECRET must be at least 32 chars")
}

const isProd = process.env.NODE_ENV === "production"
const cookiePrefix = isProd ? "__Secure-" : ""

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        preToken: { label: "Pre-token", type: "text" },
        totpCode: { label: "2FA Code", type: "text" },
      },
      async authorize(credentials, req) {
        // Rate limit by IP
        const ip = (req?.headers as Record<string, string> | undefined)?.["x-forwarded-for"]?.split(",")[0]?.trim()
          ?? (req?.headers as Record<string, string> | undefined)?.["x-real-ip"]
          ?? "unknown"
        const rl = rateLimit(`login:${ip}`, { windowMs: 15 * 60 * 1000, max: 10, lockoutMs: 30 * 60 * 1000 })
        if (!rl.allowed) return null

        const { preToken, totpCode } = credentials ?? {}
        if (!preToken || !verifyPreToken(preToken)) return null

        // Check 2FA
        const totpEnabledRow = await prisma.setting.findUnique({ where: { key: "totpEnabled" } })
        if (totpEnabledRow?.value === "true") {
          if (!totpCode) return null
          const secretRow = await prisma.setting.findUnique({ where: { key: "totpSecret" } })
          if (!secretRow?.value || !verifyTOTP(totpCode, secretRow.value)) return null
        }

        return { id: "admin", name: "Admin" }
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 8 * 60 * 60, updateAge: 60 * 60 },
  jwt: { maxAge: 8 * 60 * 60 },
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: isProd },
    },
    callbackUrl: {
      name: `${cookiePrefix}next-auth.callback-url`,
      options: { sameSite: "lax", path: "/", secure: isProd },
    },
    csrfToken: {
      name: `${isProd ? "__Host-" : ""}next-auth.csrf-token`,
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: isProd },
    },
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      try {
        const u = new URL(url, baseUrl)
        if (u.origin === baseUrl) return u.toString()
      } catch { /* fallthrough */ }
      return baseUrl
    },
  },
  pages: { signIn: "/admin/login" },
  secret,
  debug: false,
}

export { clientIp }
