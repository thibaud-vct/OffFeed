import { prisma } from "@/lib/prisma"
import { isSitePublic } from "@/lib/settings"
import { InfinitePhotoGrid } from "@/components/InfinitePhotoGrid"
import { ProfileHeader } from "@/components/ProfileHeader"
import { SiteHeader } from "@/components/SiteHeader"
import { redirect } from "next/navigation"
import Link from "next/link"

export const dynamic = "force-dynamic"

const PROFILE_KEYS = [
  "siteTitle", "profileName", "profileBio", "profileWebsite",
  "profileAvatar", "igUsername", "igFollowersCount", "igFollowsCount",
]

export default async function HomePage({
  searchParams,
}: {
  searchParams: { tag?: string }
}) {
  const isPublic = await isSitePublic()
  if (!isPublic) redirect("/admin/login")

  const tag = searchParams.tag
  const where = {
    published: true,
    ...(tag ? { tags: { contains: `"${tag}"` } } : {}),
  }

  const [posts, total, postCount, settingRows] = await Promise.all([
    prisma.post.findMany({ where, orderBy: { takenAt: "desc" }, take: 24 }),
    prisma.post.count({ where }),
    prisma.post.count({ where: { published: true } }),
    prisma.setting.findMany({ where: { key: { in: PROFILE_KEYS } } }),
  ])

  const s = Object.fromEntries(settingRows.map((r) => [r.key, r.value]))
  const username = s.siteTitle || "OffFeed"
  const igUsername = s.igUsername || ""
  const igUrl = igUsername
    ? `https://www.instagram.com/${igUsername.replace(/^@/, "")}/`
    : null

  return (
    <div className="mx-auto max-w-[935px]">
      <SiteHeader username={username} igUrl={igUrl} />

      {/* Profil */}
      <ProfileHeader
        name={s.profileName || ""}
        username={username}
        bio={s.profileBio || ""}
        website={s.profileWebsite || ""}
        avatarPath={s.profileAvatar || ""}
        igUsername={igUsername}
        postCount={postCount}
        followersCount={parseInt(s.igFollowersCount || "0")}
        followsCount={parseInt(s.igFollowsCount || "0")}
      />

      {/* Onglet grille */}
      <div className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex justify-center py-2">
          <div className="border-t-2 border-zinc-900 px-6 py-2 dark:border-white">
            <svg className="h-5 w-5 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h7v7H3zm0 11h7v7H3zm11-11h7v7h-7zm0 11h7v7h-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Filtre tag */}
      {tag && (
        <div className="flex items-center gap-2 px-4 py-2 text-sm">
          <span className="text-zinc-400">#</span>
          <span className="font-medium dark:text-white">{tag}</span>
          <Link href="/" className="ml-1 text-zinc-400">×</Link>
        </div>
      )}

      <InfinitePhotoGrid initialPosts={posts} total={total} tag={tag} />
    </div>
  )
}
