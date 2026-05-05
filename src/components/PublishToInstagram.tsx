"use client"

import { useState } from "react"
import Link from "next/link"

interface Props {
  postId: string
  alreadyPublished: boolean
  igPermalink?: string | null
  igConfigured: boolean
  igScheduledAt?: string | null
}

export default function PublishToInstagram({
  postId,
  alreadyPublished,
  igPermalink,
  igConfigured,
  igScheduledAt,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [permalink, setPermalink] = useState(igPermalink ?? "")
  const [published, setPublished] = useState(alreadyPublished)
  const [scheduled, setScheduled] = useState(igScheduledAt ? new Date(igScheduledAt) : null)
  const [error, setError] = useState("")

  if (!igConfigured) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
        Instagram publishing is not configured.{" "}
        <Link href="/admin/settings" className="underline hover:text-zinc-700">
          Add your credentials in Settings
        </Link>{" "}
        to enable this feature.
      </div>
    )
  }

  if (published) {
    return (
      <div className="flex items-center gap-3 text-sm text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#E1306C]" />
          Published on Instagram
        </span>
        {permalink && (
          <a
            href={permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-zinc-700"
          >
            View post →
          </a>
        )}
      </div>
    )
  }

  if (scheduled) {
    async function handleCancelSchedule() {
      if (!confirm("Annuler la programmation?")) return
      setLoading(true)
      try {
        const res = await fetch(`/api/posts/${postId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ igScheduledAt: null }),
        })
        if (!res.ok) throw new Error("Failed to cancel schedule")
        setScheduled(null)
      } catch (err) {
        setError(String(err))
      } finally {
        setLoading(false)
      }
    }

    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-900/20">
          <p className="text-blue-900 dark:text-blue-200">
            ✓ Programmé pour Instagram le{" "}
            <strong>
              {scheduled.toLocaleDateString("fr-FR", {
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </strong>
          </p>
        </div>
        <button
          onClick={handleCancelSchedule}
          disabled={loading}
          className="text-sm text-red-500 hover:text-red-600 disabled:opacity-50"
        >
          {loading ? "Annulation…" : "Annuler la programmation"}
        </button>
      </div>
    )
  }

  async function handlePublish() {
    if (!confirm("Publish this post to Instagram now?")) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Publish failed")
      setPublished(true)
      setPermalink(data.igPermalink ?? "")
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-zinc-700">Publish to Instagram</p>
      <button
        onClick={handlePublish}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded bg-[#E1306C] px-4 py-2 text-sm font-medium text-white hover:bg-[#c12659] disabled:opacity-50"
      >
        {loading ? (
          "Publishing…"
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
            Publish to Instagram
          </>
        )}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
