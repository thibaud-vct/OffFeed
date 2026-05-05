import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSitePublic } from "@/lib/settings"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const isPublic = await isSitePublic()

  if (!isPublic && !session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const post = await prisma.post.findUnique({ where: { id: params.id } })
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!session && !post.published) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(post)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const post = await prisma.post.update({
    where: { id: params.id },
    data: {
      caption: body.caption,
      imagePath: body.imagePath,
      extraImages: body.extraImages !== undefined ? JSON.stringify(body.extraImages) : undefined,
      tags: body.tags !== undefined ? JSON.stringify(body.tags) : undefined,
      // Note: takenAt and createdAt are immutable and cannot be changed
      published: body.published,
      igScheduledAt: body.igScheduledAt !== undefined ? (body.igScheduledAt ? new Date(body.igScheduledAt) : null) : undefined,
      igMediaId: body.igMediaId,
      igPermalink: body.igPermalink,
    },
  })

  return NextResponse.json(post)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await prisma.post.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
