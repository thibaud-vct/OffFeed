import { prisma } from "@/lib/prisma"
import { isSitePublic } from "@/lib/settings"
import { FeedView } from "@/components/FeedView"
import { notFound, redirect } from "next/navigation"

export const dynamic = "force-dynamic"

const PRELOAD = 4

export default async function PostPage({ params }: { params: { id: string } }) {
  const isPublic = await isSitePublic()
  if (!isPublic) redirect("/admin/login")

  const [post, settings] = await Promise.all([
    prisma.post.findUnique({ where: { id: params.id } }),
    prisma.setting.findMany({
      where: { key: { in: ["siteTitle", "profileName", "profileAvatar"] } },
    }),
  ])

  if (!post || !post.published) notFound()

  const s = Object.fromEntries(settings.map((r) => [r.key, r.value]))

  const profile = {
    username: s.siteTitle || "OffFeed",
    name: s.profileName || "",
    avatarPath: s.profileAvatar || "",
  }

  const [newerPosts, olderPosts, totalNewer, totalOlder] = await Promise.all([
    prisma.post.findMany({
      where: { published: true, takenAt: { gt: post.takenAt } },
      orderBy: { takenAt: "asc" },
      take: PRELOAD,
    }),
    prisma.post.findMany({
      where: { published: true, takenAt: { lt: post.takenAt } },
      orderBy: { takenAt: "desc" },
      take: PRELOAD,
    }),
    prisma.post.count({ where: { published: true, takenAt: { gt: post.takenAt } } }),
    prisma.post.count({ where: { published: true, takenAt: { lt: post.takenAt } } }),
  ])

  const initialPosts = [...newerPosts.reverse(), post, ...olderPosts]

  return (
    <FeedView
      initialPosts={initialPosts}
      focusId={post.id}
      profile={profile}
      hasOlderInitially={totalOlder > PRELOAD}
      hasNewerInitially={totalNewer > PRELOAD}
    />
  )
}
