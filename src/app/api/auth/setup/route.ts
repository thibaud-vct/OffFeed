import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

async function isSetupAllowed(): Promise<boolean> {
  const row = await prisma.setting.findUnique({ where: { key: "adminPasswordHash" } })
  return !row?.value
}

export async function GET() {
  return NextResponse.json({ allowed: await isSetupAllowed() })
}

export async function POST(req: NextRequest) {
  // Only allowed when no password exists yet
  if (!(await isSetupAllowed())) {
    return NextResponse.json({ error: "Configuration déjà effectuée" }, { status: 403 })
  }

  const { password } = await req.json()

  if (typeof password !== "string" || password.length < 12 || password.length > 200) {
    return NextResponse.json({ error: "Le mot de passe doit faire au moins 12 caractères" }, { status: 400 })
  }
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length
  if (classes < 3) {
    return NextResponse.json({ error: "Le mot de passe doit contenir majuscule, minuscule et chiffre ou symbole" }, { status: 400 })
  }

  const hash = await bcrypt.hash(password, 12)
  await prisma.setting.create({ data: { key: "adminPasswordHash", value: hash } })

  return NextResponse.json({ ok: true })
}
