import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const PUBLIC_KEYS = ["siteTitle", "sitePublic", "profileName", "profileBio", "profileWebsite", "profileAvatar", "igUsername", "igFollowersCount", "igFollowsCount"]
const PROTECTED_KEYS = ["igUserId", "igAccessToken", "totpEnabled"]
const ALL_KEYS = [...PUBLIC_KEYS, ...PROTECTED_KEYS]

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await prisma.setting.findMany({ where: { key: { in: ALL_KEYS } } })
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  return NextResponse.json(settings)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body: Record<string, string> = await req.json()

  await Promise.all(
    Object.entries(body)
      .filter(([k]) => ALL_KEYS.includes(k))
      .map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        }),
      ),
  )

  return NextResponse.json({ ok: true })
}
