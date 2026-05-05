"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Post } from "@prisma/client"

interface Props {
  initialPosts: Post[]
  total: number
  tag?: string
}

export function InfinitePhotoGrid({ initialPosts, total, tag }: Props) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(initialPosts.length >= total)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Conserve la position de scroll au retour depuis le feed
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual"
    const saved = sessionStorage.getItem("wallScroll")
    if (saved) {
      window.scrollTo(0, parseInt(saved))
      sessionStorage.removeItem("wallScroll")
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (loading || done) return
    setLoading(true)
    const nextPage = page + 1
    const params = new URLSearchParams({ page: String(nextPage), limit: "24" })
    if (tag) params.set("tag", tag)
    try {
      const res = await fetch(`/api/posts?${params}`)
      const data = await res.json()
      if (data.posts.length === 0) {
        setDone(true)
        return
      }
      setPosts((prev) => [...prev, ...data.posts])
      setPage(nextPage)
      if (posts.length + data.posts.length >= data.total) setDone(true)
    } finally {
      setLoading(false)
    }
  }, [loading, done, page, posts.length, tag])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore() },
      { rootMargin: "400px" },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-400 dark:text-zinc-600">
        <p>Aucune photo.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-px bg-zinc-200 dark:bg-zinc-800">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/p/${post.id}`}
            onClick={() => sessionStorage.setItem("wallScroll", String(window.scrollY))}
            className="group relative block w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900"
            style={{ aspectRatio: "3 / 4" }}
          >
            <Image
              src={post.imagePath}
              alt={post.caption || ""}
              fill
              sizes="33vw"
              className="object-cover transition-opacity duration-150 group-hover:opacity-90"
            />
            {/* Indicateur carousel */}
            {JSON.parse(post.extraImages).length > 0 && (
              <svg
                className="absolute right-1.5 top-1.5 h-4 w-4 drop-shadow"
                viewBox="0 0 24 24"
                fill="white"
              >
                <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm16-4a2 2 0 012 2v12a2 2 0 01-2 2v-2a2 2 0 000-4V4zm-2 2H4v12h12V4z" />
              </svg>
            )}
          </Link>
        ))}
      </div>

      <div ref={sentinelRef} className="flex justify-center py-8">
        {loading && (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
        )}
        {done && posts.length > 0 && (
          <p className="text-xs text-zinc-300 dark:text-zinc-700">— {posts.length} photos —</p>
        )}
      </div>
    </>
  )
}
