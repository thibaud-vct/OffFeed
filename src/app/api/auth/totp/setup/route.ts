import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateSecret, generateQRDataURL } from "@/lib/totp"

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [titleRow, userRow] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "siteTitle" } }),
    prisma.setting.findUnique({ where: { key: "adminEmail" } }),
  ])

  const secret = generateSecret()
  // Store pending secret (not yet enabled) until user confirms a code
  await prisma.setting.upsert({
    where: { key: "totpPendingSecret" },
    update: { value: secret },
    create: { key: "totpPendingSecret", value: secret },
  })

  const issuer = titleRow?.value || "OffFeed"
  const account = userRow?.value || "admin"
  const qr = await generateQRDataURL(secret, issuer, account)

  return NextResponse.json({ qr, secret })
}
