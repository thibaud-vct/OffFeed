import { prisma } from "@/lib/prisma"
import { getSetting } from "@/lib/settings"
import { PostForm } from "@/components/PostForm"
import PublishToInstagram from "@/components/PublishToInstagram"

export const dynamic = "force-dynamic"

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: { edit?: string }
}) {
  const [post, draftCount, igUserId, igAccessToken] = await Promise.all([
    searchParams.edit
      ? prisma.post.findUnique({ where: { id: searchParams.edit } })
      : Promise.resolve(null),
    prisma.post.count({ where: { published: false } }),
    getSetting("igUserId"),
    getSetting("igAccessToken"),
  ])

  const igConfigured = !!(igUserId && igAccessToken)

  return (
    <div>
      <PostForm post={post ?? undefined} igConfigured={igConfigured} draftCount={draftCount} />

      {post && (
        <div className="mx-auto mt-10 max-w-xl border-t border-zinc-200 pt-8">
          <PublishToInstagram
            postId={post.id}
            alreadyPublished={!!post.igMediaId}
            igPermalink={post.igPermalink}
            igConfigured={igConfigured}
            igScheduledAt={post.igScheduledAt?.toISOString() ?? null}
          />
        </div>
      )}
    </div>
  )
}
