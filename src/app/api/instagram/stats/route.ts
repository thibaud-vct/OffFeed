import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSetting } from "@/lib/settings"

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [accessToken, userId] = await Promise.all([
    getSetting("igAccessToken"),
    getSetting("igUserId"),
  ])

  if (!accessToken || !userId) {
    return NextResponse.json({ error: "Instagram credentials not configured" }, { status: 422 })
  }

  // Token passed via Authorization header — never in URL (prevents log leakage)
  const res = await fetch(
    `https://graph.instagram.com/v19.0/${userId}?fields=followers_count,follows_count,media_count`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!res.ok) {
    // Log detailed error server-side only, return generic message to client
    console.error("[instagram/stats] API error:", res.status, await res.text())
    return NextResponse.json({ error: "Erreur lors de la récupération des statistiques Instagram" }, { status: 502 })
  }

  const data = await res.json()

  await Promise.all([
    prisma.setting.upsert({ where: { key: "igFollowersCount" }, update: { value: String(data.followers_count ?? 0) }, create: { key: "igFollowersCount", value: String(data.followers_count ?? 0) } }),
    prisma.setting.upsert({ where: { key: "igFollowsCount" }, update: { value: String(data.follows_count ?? 0) }, create: { key: "igFollowsCount", value: String(data.follows_count ?? 0) } }),
  ])

  return NextResponse.json({
    followersCount: data.followers_count,
    followsCount: data.follows_count,
    mediaCount: data.media_count,
  })
}
