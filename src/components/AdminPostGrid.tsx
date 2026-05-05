"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { Post } from "@prisma/client"

interface Props {
  posts: Post[]
}

export function AdminPostGrid({ posts }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce post ? Cette action est irréversible.")) return
    setDeleting(id)
    try {
      await fetch(`/api/posts/${id}`, { method: "DELETE" })
      router.refresh()
    } finally {
      setDeleting(null)
    }
  }

  if (posts.length === 0) {
    return (
      <p className="py-16 text-center text-zinc-400 dark:text-zinc-600">
        Aucun post.{" "}
        <Link href="/admin/new" className="underline">
          En créer un
        </Link>{" "}
        ou{" "}
        <Link href="/admin/import" className="underline">
          importer une archive
        </Link>
        .
      </p>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-px bg-zinc-200 dark:bg-zinc-800 sm:grid-cols-4 md:grid-cols-5">
      {posts.map((post) => (
        <div key={post.id} className="group relative">
          <div className="relative aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-900">
            <Image
              src={post.imagePath}
              alt=""
              fill
              sizes="20vw"
              className="object-cover"
            />
            {/* Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <Link
                href={`/admin/new?edit=${post.id}`}
                className="w-24 rounded bg-white px-2 py-1 text-center text-xs font-semibold text-zinc-900 hover:bg-zinc-100"
              >
                Modifier
              </Link>
              <button
                onClick={() => handleDelete(post.id)}
                disabled={deleting === post.id}
                className="w-24 rounded bg-red-500 px-2 py-1 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deleting === post.id ? "…" : "Supprimer"}
              </button>
            </div>
          </div>

          {/* Badges */}
          <div className="absolute left-1.5 top-1.5 flex gap-1">
            {!post.published && (
              <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                Brouillon
              </span>
            )}
            {post.igMediaId && (
              <span className="rounded bg-[#E1306C]/80 px-1.5 py-0.5 text-[10px] text-white">
                IG
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
