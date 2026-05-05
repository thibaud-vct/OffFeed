import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSetting } from "@/lib/settings"
import { publishSingleImage, publishCarousel } from "@/lib/instagram"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { postId } = await req.json()
  if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 })

  const post = await prisma.post.findUnique({ where: { id: postId } })
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 })

  const accessToken = await getSetting("igAccessToken")
  const userId = await getSetting("igUserId")

  if (!accessToken || !userId) {
    return NextResponse.json(
      { error: "Instagram credentials not configured in Settings" },
      { status: 422 },
    )
  }

  // Build absolute URL from imagePath (must be publicly reachable for IG API)
  const siteUrl = process.env.NEXTAUTH_URL ?? ""
  const mainUrl = post.imagePath.startsWith("http")
    ? post.imagePath
    : `${siteUrl}${post.imagePath}`

  const extras: string[] = JSON.parse(post.extraImages)

  let result
  if (extras.length > 0) {
    const allUrls = [mainUrl, ...extras.map((p) => (p.startsWith("http") ? p : `${siteUrl}${p}`))]
    result = await publishCarousel(allUrls, post.caption, accessToken, userId)
  } else {
    result = await publishSingleImage(mainUrl, post.caption, accessToken, userId)
  }

  const updated = await prisma.post.update({
    where: { id: postId },
    data: { igMediaId: result.igMediaId, igPermalink: result.igPermalink },
  })

  return NextResponse.json(updated)
}
