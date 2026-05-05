"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import type { Post } from "@prisma/client"
import { ImageCropper } from "./ImageCropper"

interface Props {
  post?: Post
  igConfigured?: boolean
  draftCount?: number
}

export function PostForm({ post, igConfigured, draftCount }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [images, setImages] = useState<string[]>(() => {
    if (!post) return []
    const extras: string[] = JSON.parse(post.extraImages || "[]")
    return [post.imagePath, ...extras]
  })

  const [caption, setCaption] = useState(post?.caption ?? "")
  const [tagInput, setTagInput] = useState(
    post?.tags ? (JSON.parse(post.tags) as string[]).join(", ") : "",
  )
  const [igScheduledAt, setIgScheduledAt] = useState(
    post?.igScheduledAt ? new Date(post.igScheduledAt).toISOString().slice(0, 16) : "",
  )
  const [published, setPublished] = useState(post?.published ?? true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")
  const [showTags, setShowTags] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const dragIndex = useRef<number | null>(null)
  const touchClone = useRef<HTMLElement | null>(null)
  const thumbsRef = useRef<HTMLDivElement>(null)
  // Crop queue: raw object URLs waiting to be cropped
  const [cropQueue, setCropQueue] = useState<string[]>([])
  const [cropIndex, setCropIndex] = useState(0)

  const parsedTags = tagInput.split(",").map((t) => t.trim()).filter(Boolean)

  function reorderTo(from: number, to: number) {
    if (from === to) return
    setImages((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
    setActiveIndex(to)
    requestAnimationFrame(() => {
      carouselRef.current?.scrollTo({ left: to * (carouselRef.current?.clientWidth ?? 0), behavior: "smooth" })
    })
  }

  function onTouchStart(e: React.TouchEvent, i: number) {
    dragIndex.current = i
    const el = e.currentTarget as HTMLElement
    const rect = el.getBoundingClientRect()
    const clone = el.cloneNode(true) as HTMLElement
    clone.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;opacity:0.85;pointer-events:none;z-index:9999;transition:none;border-radius:6px;overflow:hidden;`
    document.body.appendChild(clone)
    touchClone.current = clone
  }

  function onTouchMove(e: React.TouchEvent) {
    e.preventDefault()
    const touch = e.touches[0]
    if (touchClone.current) {
      const clone = touchClone.current
      const w = parseFloat(clone.style.width)
      const h = parseFloat(clone.style.height)
      clone.style.left = `${touch.clientX - w / 2}px`
      clone.style.top = `${touch.clientY - h / 2}px`
    }
    // Find which thumb is under finger
    if (!thumbsRef.current) return
    const thumbs = Array.from(thumbsRef.current.querySelectorAll<HTMLElement>("[data-thumb-index]"))
    for (const thumb of thumbs) {
      const rect = thumb.getBoundingClientRect()
      if (touch.clientX >= rect.left && touch.clientX <= rect.right && touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        const idx = parseInt(thumb.dataset.thumbIndex ?? "-1")
        if (idx >= 0) setDragOver(idx)
        return
      }
    }
    setDragOver(null)
  }

  function onTouchEnd() {
    if (touchClone.current) { document.body.removeChild(touchClone.current); touchClone.current = null }
    const from = dragIndex.current
    const to = dragOver
    setDragOver(null)
    dragIndex.current = null
    if (from !== null && to !== null) reorderTo(from, to)
  }

  async function uploadFile(file: File): Promise<string> {
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/upload", { method: "POST", body: fd })
    if (!res.ok) throw new Error(await res.text())
    const { path } = await res.json()
    return path
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const remaining = 10 - images.length
    if (remaining <= 0) return
    const toProcess = files.slice(0, remaining)
    // Create object URLs and open crop queue
    const urls = toProcess.map((f) => URL.createObjectURL(f))
    setCropQueue(urls)
    setCropIndex(0)
    e.target.value = ""
  }

  async function handleCropDone(blob: Blob) {
    setUploading(true)
    setError("")
    try {
      const file = new File([blob], "photo.jpg", { type: "image/jpeg" })
      const path = await uploadFile(file)
      setImages((prev) => [...prev, path])
    } catch (err) {
      setError(String(err))
    } finally {
      setUploading(false)
    }
    advanceCropQueue()
  }

  function handleCropSkip() {
    advanceCropQueue()
  }

  function advanceCropQueue() {
    setCropIndex((prev) => {
      const next = prev + 1
      if (next >= cropQueue.length) {
        cropQueue.forEach((url) => URL.revokeObjectURL(url))
        setCropQueue([])
        return 0
      }
      return next
    })
  }

  function handleCropCancel() {
    cropQueue.forEach((url) => URL.revokeObjectURL(url))
    setCropQueue([])
    setCropIndex(0)
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (images.length === 0) { setError("Une photo est requise"); return }
    setSaving(true)
    setError("")
    try {
      const url = post ? `/api/posts/${post.id}` : "/api/posts"
      const method = post ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePath: images[0],
          extraImages: images.slice(1),
          caption,
          tags: parsedTags,
          igScheduledAt: igScheduledAt || undefined,
          published,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      router.push("/")
      router.refresh()
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!post) return
    if (!confirm("Supprimer ce post ? Cette action est irréversible.")) return
    setDeleting(true)
    try {
      await fetch(`/api/posts/${post.id}`, { method: "DELETE" })
      router.push("/")
      router.refresh()
    } catch (err) {
      setError(String(err))
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="-mx-4 -mt-8 flex flex-col min-h-[calc(100vh-60px)]">

      {/* Sub-header */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-900">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-zinc-500 dark:text-zinc-400"
        >
          Annuler
        </button>
        <p className="text-sm font-semibold dark:text-white">
          {post ? "Modifier" : "Nouvelle publication"}
        </p>
        {draftCount !== undefined && draftCount > 0 && !post && (
          <a
            href="/admin/drafts"
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
          >
            Brouillons ({draftCount})
          </a>
        )}
        {(!draftCount || draftCount === 0 || post) && <div className="w-16" />}
      </div>

      {/* Image area */}
      {images.length === 0 ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center gap-3 border-b border-zinc-100 py-16 text-zinc-400 hover:text-zinc-500 disabled:opacity-50 dark:border-zinc-900 dark:text-zinc-600"
        >
          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4-4a3 3 0 014 0l4 4m-2-2l2-2a3 3 0 014 0l2 2M14 8a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-sm">{uploading ? "Chargement…" : "Ajouter des photos"}</span>
        </button>
      ) : (
        <div className="border-b border-zinc-100 dark:border-zinc-900">
          {/* Main preview — horizontal snap scroll */}
          <div className="relative">
            <div
              ref={carouselRef}
              className="flex snap-x snap-mandatory overflow-x-auto scrollbar-hide"
              onScroll={(e) => {
                const el = e.currentTarget
                const idx = Math.round(el.scrollLeft / el.clientWidth)
                setActiveIndex(idx)
              }}
            >
              {images.map((src, i) => (
                <div
                  key={src + i}
                  className="relative w-full flex-shrink-0 snap-center bg-black"
                  style={{ aspectRatio: "3/4" }}
                >
                  <Image src={src} alt="" fill className="object-cover" sizes="100vw" />
                </div>
              ))}
            </div>
            {images.length > 1 && (
              <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                {activeIndex + 1} / {images.length}
              </div>
            )}
          </div>

          {/* Thumbnails strip */}
          <div ref={thumbsRef} className="flex gap-2 overflow-x-auto bg-zinc-50 px-3 py-2 dark:bg-zinc-950" style={{ touchAction: "none" }}>
            {images.map((src, i) => (
              <div
                key={src + i}
                data-thumb-index={i}
                className={`relative flex-shrink-0 transition-transform duration-150 ${dragOver === i ? "scale-110" : ""}`}
                draggable
                onDragStart={() => { dragIndex.current = i }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(i) }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => { e.preventDefault(); const from = dragIndex.current; dragIndex.current = null; setDragOver(null); if (from !== null) reorderTo(from, i) }}
                onDragEnd={() => { dragIndex.current = null; setDragOver(null) }}
                onTouchStart={(e) => onTouchStart(e, i)}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveIndex(i)
                    carouselRef.current?.scrollTo({ left: i * carouselRef.current.clientWidth, behavior: "smooth" })
                  }}
                  className={`relative block h-16 w-12 overflow-hidden rounded transition-opacity ${i === activeIndex ? "ring-2 ring-blue-500" : "opacity-60 hover:opacity-80"} ${dragOver === i ? "ring-2 ring-white" : ""}`}
                >
                  <Image src={src} alt="" fill className="object-cover" draggable={false} />
                </button>
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-white"
                >
                  <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                {i === 0 && (
                  <span className="absolute bottom-0 left-0 right-0 bg-black/50 py-0.5 text-center text-[9px] text-white">
                    cover
                  </span>
                )}
              </div>
            ))}

            {images.length < 10 && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex h-16 w-12 flex-shrink-0 flex-col items-center justify-center rounded border-2 border-dashed border-zinc-300 text-zinc-400 disabled:opacity-50 dark:border-zinc-700"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        multiple
        ref={fileRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Caption */}
      <div className="flex items-start gap-3 border-b border-zinc-100 px-4 py-4 dark:border-zinc-900">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={2200}
          rows={3}
          placeholder="Ajouter une légende…"
          className="flex-1 resize-none bg-transparent text-sm leading-relaxed placeholder-zinc-400 focus:outline-none dark:text-white dark:placeholder-zinc-600"
        />
        <span className="mt-1 text-xs text-zinc-300 dark:text-zinc-700">
          {caption.length}
        </span>
      </div>

      {/* Tags row */}
      <div className="border-b border-zinc-100 dark:border-zinc-900">
        <button
          type="button"
          onClick={() => setShowTags((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3.5 text-sm dark:text-white"
        >
          <span>Tags</span>
          <div className="flex items-center gap-2 text-zinc-400">
            {parsedTags.length > 0 && (
              <span className="text-xs">
                {parsedTags.map((t) => `#${t}`).join(" ")}
              </span>
            )}
            <svg
              className={`h-4 w-4 transition-transform ${showTags ? "rotate-90" : ""}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
        {showTags && (
          <div className="px-4 pb-3">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="voyage, photo, architecture"
              autoFocus
              className="w-full bg-transparent text-sm placeholder-zinc-400 focus:outline-none dark:text-white dark:placeholder-zinc-600"
            />
          </div>
        )}
      </div>

      {/* Instagram Schedule row (only if Instagram configured) */}
      {igConfigured && (
        <div className="border-b border-zinc-100 dark:border-zinc-900">
          <button
            type="button"
            onClick={() => setShowSchedule((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3.5 text-sm dark:text-white"
          >
            <span>Programmer sur Instagram</span>
            <div className="flex items-center gap-2 text-zinc-400">
              {igScheduledAt && (
                <span className="text-xs">
                  {new Date(igScheduledAt).toLocaleDateString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </span>
              )}
              <svg
                className={`h-4 w-4 transition-transform ${showSchedule ? "rotate-90" : ""}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
          {showSchedule && (
            <div className="space-y-3 px-4 pb-3">
              <input
                type="datetime-local"
                value={igScheduledAt}
                onChange={(e) => setIgScheduledAt(e.target.value)}
                autoFocus
                className="w-full bg-transparent text-sm focus:outline-none dark:text-white dark:placeholder-zinc-600 dark:[color-scheme:dark]"
              />
              {igScheduledAt && new Date(igScheduledAt) < new Date() && (
                <p className="text-xs text-amber-500">
                  ⚠️ Cette date est dans le passé. Le post sera publié immédiatement lors de la sauvegarde.
                </p>
              )}
              {igScheduledAt && (
                <button
                  type="button"
                  onClick={() => setIgScheduledAt("")}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  Annuler la programmation
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Visibility row */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3.5 dark:border-zinc-900">
        <span className="text-sm dark:text-white">
          {published ? "Publié" : "Brouillon"}
        </span>
        <div
          onClick={() => setPublished(!published)}
          className={`relative h-[30px] w-[51px] cursor-pointer rounded-full transition-colors ${published ? "bg-blue-500" : "bg-zinc-200 dark:bg-zinc-700"}`}
        >
          <div
            className={`absolute top-[3px] h-6 w-6 rounded-full bg-white shadow transition-transform ${published ? "translate-x-[23px]" : "translate-x-[3px]"}`}
          />
        </div>
      </div>

      {error && (
        <p className="px-4 py-3 text-sm text-red-500">{error}</p>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom actions */}
      <div className="border-t border-zinc-100 px-4 py-4 dark:border-zinc-900">
        <button
          type="submit"
          disabled={saving || uploading || images.length === 0}
          className="w-full rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-40"
        >
          {saving ? "Enregistrement…" : post ? "Enregistrer" : "Partager"}
        </button>

        {post && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="mt-3 w-full text-center text-sm text-red-400 hover:text-red-500 disabled:opacity-50"
          >
            {deleting ? "Suppression…" : "Supprimer ce post"}
          </button>
        )}
      </div>

      {/* Crop overlay */}
      {cropQueue.length > 0 && cropIndex < cropQueue.length && (
        <ImageCropper
          key={cropIndex}
          src={cropQueue[cropIndex]}
          index={cropIndex}
          total={cropQueue.length}
          onDone={handleCropDone}
          onSkip={handleCropSkip}
          onCancel={handleCropCancel}
        />
      )}
    </form>
  )
}
