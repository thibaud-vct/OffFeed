import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { rateLimit, clientIp } from "@/lib/rateLimit"
import { signPreToken } from "@/lib/preToken"

const DUMMY_HASH = "$2a$12$CwTycUXWue0Thq9StjUM0uJ8s5A0o7RkY9m1oVqD9vXQ3xCmHwE6e"
const MAX_PW = 200

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  const rl = rateLimit(`pre-login:${ip}`, { windowMs: 15 * 60 * 1000, max: 10, lockoutMs: 30 * 60 * 1000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: "Trop de tentatives" }, {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfter) },
    })
  }

  const { password } = await req.json()
  if (typeof password !== "string" || password.length === 0 || password.length > MAX_PW) {
    // Still run bcrypt to equalize timing
    await bcrypt.compare("dummy", DUMMY_HASH)
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 })
  }

  const [hashRow, totpEnabledRow] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "adminPasswordHash" } }),
    prisma.setting.findUnique({ where: { key: "totpEnabled" } }),
  ])

  const hash = hashRow?.value?.startsWith("$2") ? hashRow.value : DUMMY_HASH
  const valid = await bcrypt.compare(password, hash)

  if (!valid || !hashRow?.value) {
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 })
  }

  return NextResponse.json({
    preToken: signPreToken(),
    requires2FA: totpEnabledRow?.value === "true",
  })
}
