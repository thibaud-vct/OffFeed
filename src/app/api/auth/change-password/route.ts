import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { verifyToken as verifyTOTP } from "@/lib/totp"

const MAX_PW = 200

function validatePassword(pw: unknown): string | null {
  if (typeof pw !== "string" || pw.length < 12 || pw.length > MAX_PW)
    return "Le mot de passe doit faire au moins 12 caractères"
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(pw)).length
  if (classes < 3)
    return "Le mot de passe doit contenir majuscule, minuscule et chiffre ou symbole"
  return null
}

// POST { newPassword, totpCode }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { newPassword, totpCode } = await req.json()

  const pwErr = validatePassword(newPassword)
  if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 })

  if (!totpCode) return NextResponse.json({ error: "Code 2FA requis" }, { status: 400 })

  const secretRow = await prisma.setting.findUnique({ where: { key: "totpSecret" } })
  if (!secretRow?.value || !verifyTOTP(String(totpCode), secretRow.value))
    return NextResponse.json({ error: "Code 2FA invalide" }, { status: 400 })

  const hash = await bcrypt.hash(newPassword as string, 12)
  await prisma.setting.upsert({
    where: { key: "adminPasswordHash" },
    update: { value: hash },
    create: { key: "adminPasswordHash", value: hash },
  })

  return NextResponse.json({ ok: true })
}
