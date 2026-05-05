"use client"

import { forwardRef, useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import type { Post } from "@prisma/client"

interface Profile {
  username: string
  name: string
  avatarPath: string
}

interface Props {
  initialPosts: Post[]
  focusId: string
  profile: Profile
  hasOlderInitially: boolean
  hasNewerInitially: boolean
}

const CHUNK = 5

export function FeedView({
  initialPosts,
  focusId,
  profile,
  hasOlderInitially,
  hasNewerInitially,
}: Props) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [loadingNewer, setLoadingNewer] = useState(false)
  const [doneOlder, setDoneOlder] = useState(!hasOlderInitially)
  const [doneNewer, setDoneNewer] = useState(!hasNewerInitially)

  const topSentinelRef = useRef<HTMLDivElement>(null)
  const bottomSentinelRef = useRef<HTMLDivElement>(null)
  const focusRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Scroll au post cliqué au montage
  useEffect(() => {
    requestAnimationFrame(() => {
      focusRef.current?.scrollIntoView({ behavior: "instant", block: "start" })
    })
  }, [])

  const loadOlder = useCallback(async () => {
    if (loadingOlder || doneOlder) return
    const oldest = posts[posts.length - 1]
    if (!oldest) return
    setLoadingOlder(true)
    try {
      const res = await fetch(`/api/posts?afterId=${oldest.id}&limit=${CHUNK}`)
      const { posts: next } = await res.json()
      if (!next?.length) { setDoneOlder(true); return }
      setPosts((prev) => [...prev, ...next])
      if (next.length < CHUNK) setDoneOlder(true)
    } finally {
      setLoadingOlder(false)
    }
  }, [loadingOlder, doneOlder, posts])

  const loadNewer = useCallback(async () => {
    if (loadingNewer || doneNewer) return
    const newest = posts[0]
    if (!newest) return
    setLoadingNewer(true)
    const container = containerRef.current
    const scrollBefore = container?.scrollTop ?? 0
    const heightBefore = container?.scrollHeight ?? 0
    try {
      const res = await fetch(`/api/posts?beforeId=${newest.id}&limit=${CHUNK}`)
      const { posts: prev } = await res.json()
      if (!prev?.length) { setDoneNewer(true); return }
      setPosts((cur) => [...prev, ...cur])
      if (prev.length < CHUNK) setDoneNewer(true)
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = scrollBefore + (container.scrollHeight - heightBefore)
        }
      })
    } finally {
      setLoadingNewer(false)
    }
  }, [loadingNewer, doneNewer, posts])

  useEffect(() => {
    const el = bottomSentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) loadOlder() }, { rootMargin: "500px" })
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadOlder])

  useEffect(() => {
    const el = topSentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) loadNewer() }, { rootMargin: "500px" })
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadNewer])

  return (
    <div ref={containerRef} className="h-screen overflow-y-auto bg-white pb-16 dark:bg-black">
      {/* Header sticky */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-100 bg-white/90 px-4 py-3 backdrop-blur dark:border-zinc-900 dark:bg-black/90">
        <Link
          href="/"
          className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="text-center">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Publications</p>
          <p className="text-sm font-semibold dark:text-white">{profile.username}</p>
        </div>
        <div className="w-8" />
      </header>

      <div ref={topSentinelRef} className="h-px" />
      {loadingNewer && <Spinner />}
      {doneNewer && <Divider label="Début" />}

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          profile={profile}
          ref={post.id === focusId ? focusRef : null}
        />
      ))}

      {loadingOlder && <Spinner />}
      {doneOlder && <Divider label="Fin du feed" />}
      <div ref={bottomSentinelRef} className="h-px" />

      {/* Barre d'onglets fixe bas */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around border-t border-zinc-100 bg-white/90 py-2 backdrop-blur dark:border-zinc-900 dark:bg-black/90">
        {/* Retour grille */}
        <Link href="/" className="flex flex-col items-center gap-0.5 px-5 py-1 text-zinc-900 dark:text-white">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 3h7v7H3zm0 11h7v7H3zm11-11h7v7h-7zm0 11h7v7h-7z" />
          </svg>
        </Link>
        {/* Lecture en cours (actif) */}
        <div className="flex flex-col items-center gap-0.5 px-5 py-1">
          <div className="relative">
            <svg className="h-6 w-6 text-zinc-900 dark:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 8l6 4-6 4V8z" fill="currentColor" stroke="none" />
            </svg>
            {/* Indicateur actif */}
            <span className="absolute -bottom-2 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-zinc-900 dark:bg-white" />
          </div>
        </div>
        {/* Profil */}
        <Link href="/" className="flex flex-col items-center gap-0.5 px-5 py-1 text-zinc-400 dark:text-zinc-600">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
            <circle cx="12" cy="8" r="4" />
            <path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </Link>
      </nav>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-5">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-500 dark:border-zinc-800 dark:border-t-zinc-500" />
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <p className="py-4 text-center text-xs text-zinc-300 dark:text-zinc-700">{label}</p>
  )
}

const PostCard = forwardRef<HTMLDivElement, { post: Post; profile: Profile }>(
  function PostCard({ post, profile }, ref) {
    const tags: string[] = JSON.parse(post.tags)
    const extras: string[] = JSON.parse(post.extraImages)
    const allImages = [post.imagePath, ...extras]
    const [imgIndex, setImgIndex] = useState(0)

    const date = new Date(post.takenAt).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    return (
      <article ref={ref} className="border-b border-zinc-100 dark:border-zinc-900">
        {/* En-tête post */}
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
            {profile.avatarPath ? (
              <Image src={profile.avatarPath} alt={profile.name || profile.username} fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <svg className="h-4 w-4 text-zinc-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              </div>
            )}
          </div>
          <span className="text-sm font-semibold dark:text-white">{profile.username}</span>
        </div>

        {/* Image(s) — format 3:4 portrait (1080×1440) */}
        <div className="relative w-full">
          {allImages.length === 1 ? (
            <div className="relative w-full bg-zinc-100 dark:bg-zinc-900" style={{ aspectRatio: "3/4" }}>
              <Image
                src={post.imagePath}
                alt={post.caption || ""}
                fill
                sizes="100vw"
                className="object-cover"
                priority={false}
              />
            </div>
          ) : (
            <div className="relative">
              <div
                className="flex snap-x snap-mandatory overflow-x-auto scrollbar-hide"
                onScroll={(e) => {
                  const el = e.currentTarget
                  setImgIndex(Math.round(el.scrollLeft / el.clientWidth))
                }}
              >
                {allImages.map((src, i) => (
                  <div
                    key={i}
                    className="relative w-full flex-shrink-0 snap-center bg-zinc-100 dark:bg-zinc-900"
                    style={{ aspectRatio: "3/4" }}
                  >
                    <Image src={src} alt={`Photo ${i + 1}`} fill sizes="100vw" className="object-cover" />
                  </div>
                ))}
              </div>
              {/* Dots */}
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {allImages.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${
                      i === imgIndex ? "bg-blue-500" : "bg-white/50 dark:bg-white/30"
                    }`}
                  />
                ))}
              </div>
              {/* Compteur */}
              <div className="absolute right-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
                {imgIndex + 1}/{allImages.length}
              </div>
            </div>
          )}
        </div>

        {/* Caption, tags, date */}
        <div className="px-3 py-3 space-y-1.5">
          {post.caption && (
            <p className="text-sm leading-snug dark:text-white">
              <span className="mr-1 font-semibold">{profile.username}</span>
              {post.caption}
            </p>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-x-1">
              {tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/?tag=${encodeURIComponent(tag)}`}
                  className="text-sm text-blue-500 dark:text-blue-400"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
          <p className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-600">{date}</p>
        </div>
      </article>
    )
  },
)
