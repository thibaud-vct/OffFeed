"use client"

import Image from "next/image"
import Link from "next/link"
import type { Post } from "@prisma/client"

interface Props {
  post: Post
}

export function PostCard({ post }: Props) {
  return (
    <Link
      href={`/p/${post.id}`}
      className="group relative block aspect-square overflow-hidden bg-zinc-100"
    >
      <Image
        src={post.imagePath}
        alt={post.caption || ""}
        fill
        sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />
      {/* Hover overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <p className="line-clamp-3 px-4 text-center text-sm text-white">{post.caption}</p>
      </div>
      {/* Draft badge */}
      {!post.published && (
        <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
          Draft
        </span>
      )}
    </Link>
  )
}
