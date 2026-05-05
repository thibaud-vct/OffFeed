import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAndConsume } from "@/lib/recoveryCodes"
import { signPreToken } from "@/lib/preToken"
import { rateLimit, clientIp } from "@/lib/rateLimit"

export async function POST(req: NextRequest) {
  // Strict rate limit — recovery is a sensitive action
  const ip = clientIp(req)
  const rl = rateLimit(`recover:${ip}`, { windowMs: 60 * 60 * 1000, max: 5, lockoutMs: 24 * 60 * 60 * 1000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: "Trop de tentatives. Réessayez dans 24h." }, { status: 429 })
  }

  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: "Code requis" }, { status: 400 })
  // Validate format before any DB lookup
  if (!/^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(String(code).toUpperCase())) {
    return NextResponse.json({ error: "Format de code invalide" }, { status: 400 })
  }

  const row = await prisma.setting.findUnique({ where: { key: "totpRecoveryCodes" } })
  if (!row?.value) return NextResponse.json({ error: "Aucun code de secours disponible" }, { status: 400 })

  const hashedCodes: string[] = JSON.parse(row.value)
  const { valid, remaining } = verifyAndConsume(String(code), hashedCodes)

  if (!valid) return NextResponse.json({ error: "Code de secours invalide" }, { status: 400 })

  // Consume the code and disable 2FA (force re-setup)
  await prisma.$transaction([
    prisma.setting.upsert({ where: { key: "totpRecoveryCodes" }, update: { value: JSON.stringify(remaining) }, create: { key: "totpRecoveryCodes", value: JSON.stringify(remaining) } }),
    prisma.setting.upsert({ where: { key: "totpEnabled" }, update: { value: "false" }, create: { key: "totpEnabled", value: "false" } }),
    prisma.setting.deleteMany({ where: { key: { in: ["totpSecret", "totpPendingSecret"] } } }),
  ])

  // Return a preToken so the login page can complete sign-in (no 2FA required now)
  return NextResponse.json({ preToken: signPreToken(), codesLeft: remaining.length })
}
