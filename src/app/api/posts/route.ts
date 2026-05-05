import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSitePublic } from "@/lib/settings"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const isPublic = await isSitePublic()

  if (!isPublic && !session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const rawTag = searchParams.get("tag")
  // Whitelist: alphanumeric, hyphens, underscores, accented chars — max 64 chars
  const tag = rawTag && /^[\p{L}\p{N}_-]{1,64}$/u.test(rawTag) ? rawTag : null
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "24"), 1), 100)

  // Cursor-based (used by feed)
  const afterId = searchParams.get("afterId")   // posts plus anciens
  const beforeId = searchParams.get("beforeId") // posts plus récents

  // Offset-based (used by wall)
  const page = parseInt(searchParams.get("page") ?? "1")

  const publishedFilter = session ? undefined : true

  const tagFilter = tag ? { tags: { contains: `"${tag}"` } } : {}

  // Cursor: find the reference post's takenAt
  if (afterId || beforeId) {
    const refId = afterId ?? beforeId!
    const ref = await prisma.post.findUnique({ where: { id: refId }, select: { takenAt: true } })
    if (!ref) return NextResponse.json({ posts: [] })

    const where = {
      published: publishedFilter,
      ...tagFilter,
      takenAt: afterId
        ? { lt: ref.takenAt }   // plus vieux que le ref → scroll vers le bas
        : { gt: ref.takenAt },  // plus récent que le ref → scroll vers le haut
    }

    const posts = await prisma.post.findMany({
      where,
      orderBy: { takenAt: afterId ? "desc" : "asc" },
      take: limit,
    })

    // beforeId : on retourne en ordre desc pour cohérence
    return NextResponse.json({ posts: beforeId ? posts.reverse() : posts })
  }

  // Offset classique
  const where = {
    published: publishedFilter,
    ...tagFilter,
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { takenAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.post.count({ where }),
  ])

  return NextResponse.json({ posts, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const post = await prisma.post.create({
    data: {
      caption: body.caption ?? "",
      imagePath: body.imagePath,
      extraImages: body.extraImages ? JSON.stringify(body.extraImages) : "[]",
      tags: body.tags ? JSON.stringify(body.tags) : "[]",
      takenAt: new Date(), // Always use current time as publication date
      published: body.published ?? true,
      igScheduledAt: body.igScheduledAt ? new Date(body.igScheduledAt) : null,
      source: body.source ?? "manual",
    },
  })

  return NextResponse.json(post, { status: 201 })
}
