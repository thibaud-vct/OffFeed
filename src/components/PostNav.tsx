"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface Props {
  prevId?: string
  nextId?: string
}

export function PostNav({ prevId, nextId }: Props) {
  const router = useRouter()

  // Navigation clavier ← →
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && prevId) router.push(`/p/${prevId}`)
      if (e.key === "ArrowRight" && nextId) router.push(`/p/${nextId}`)
      if (e.key === "Escape") router.push("/")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [prevId, nextId, router])

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => prevId && router.push(`/p/${prevId}`)}
        disabled={!prevId}
        className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        aria-label="Post précédent"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={() => nextId && router.push(`/p/${nextId}`)}
        disabled={!nextId}
        className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        aria-label="Post suivant"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}
