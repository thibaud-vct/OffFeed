import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import AdmZip from "adm-zip"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

interface IgMedia {
  uri: string
  creation_timestamp: number
  title?: string
}

interface IgMediaJson {
  media?: IgMedia[]
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("archive") as File | null
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const zip = new AdmZip(buffer)

  // Locate media.json — Instagram exports vary in structure
  const mediaEntry =
    zip.getEntry("media.json") ??
    zip.getEntries().find((e) => e.entryName.endsWith("/media.json"))

  if (!mediaEntry) {
    return NextResponse.json({ error: "media.json not found in archive" }, { status: 422 })
  }

  const mediaJson: IgMediaJson = JSON.parse(mediaEntry.getData().toString("utf-8"))
  const items: IgMedia[] = mediaJson.media ?? []

  const uploadsDir = path.join(process.cwd(), "public", "uploads")
  await mkdir(uploadsDir, { recursive: true })

  let imported = 0
  let skipped = 0

  for (const item of items) {
    const imgEntry = zip.getEntry(item.uri)
    if (!imgEntry) { skipped++; continue }

    const filename = path.basename(item.uri)
    const dest = path.join(uploadsDir, filename)
    await writeFile(dest, imgEntry.getData())

    const imagePath = `/uploads/${filename}`

    // Skip if already imported (same path)
    const existing = await prisma.post.findFirst({ where: { imagePath } })
    if (existing) { skipped++; continue }

    await prisma.post.create({
      data: {
        imagePath,
        caption: item.title ?? "",
        takenAt: new Date(item.creation_timestamp * 1000),
        source: "import",
        published: true,
      },
    })
    imported++
  }

  return NextResponse.json({ imported, skipped })
}
