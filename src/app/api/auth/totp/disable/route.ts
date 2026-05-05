import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/totp"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: "Code requis" }, { status: 400 })

  const secretRow = await prisma.setting.findUnique({ where: { key: "totpSecret" } })
  if (!secretRow?.value) return NextResponse.json({ error: "2FA non activé" }, { status: 400 })

  if (!verifyToken(String(code), secretRow.value)) {
    return NextResponse.json({ error: "Code invalide" }, { status: 400 })
  }

  await prisma.$transaction([
    prisma.setting.upsert({
      where: { key: "totpEnabled" },
      update: { value: "false" },
      create: { key: "totpEnabled", value: "false" },
    }),
    prisma.setting.deleteMany({ where: { key: { in: ["totpSecret", "totpPendingSecret"] } } }),
  ])

  return NextResponse.json({ ok: true })
}
