import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/totp"
import { generateRecoveryCodes, hashCodes } from "@/lib/recoveryCodes"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: "Code requis" }, { status: 400 })

  const pending = await prisma.setting.findUnique({ where: { key: "totpPendingSecret" } })
  if (!pending?.value) return NextResponse.json({ error: "Aucune configuration en attente" }, { status: 400 })

  if (!verifyToken(String(code), pending.value)) {
    return NextResponse.json({ error: "Code invalide" }, { status: 400 })
  }

  const recoveryCodes = generateRecoveryCodes()
  const hashed = hashCodes(recoveryCodes)

  await prisma.$transaction([
    prisma.setting.upsert({ where: { key: "totpSecret" }, update: { value: pending.value }, create: { key: "totpSecret", value: pending.value } }),
    prisma.setting.upsert({ where: { key: "totpEnabled" }, update: { value: "true" }, create: { key: "totpEnabled", value: "true" } }),
    prisma.setting.upsert({ where: { key: "totpRecoveryCodes" }, update: { value: JSON.stringify(hashed) }, create: { key: "totpRecoveryCodes", value: JSON.stringify(hashed) } }),
    prisma.setting.delete({ where: { key: "totpPendingSecret" } }),
  ])

  // Return plain codes once — never stored in DB
  return NextResponse.json({ ok: true, recoveryCodes })
}
