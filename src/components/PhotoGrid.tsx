import type { Post } from "@prisma/client"
import { PostCard } from "./PostCard"

interface Props {
  posts: Post[]
}

export function PhotoGrid({ posts }: Props) {
  if (posts.length === 0) {
    return (
      <div className="py-24 text-center text-zinc-400">
        <p className="text-lg">No photos yet.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}
