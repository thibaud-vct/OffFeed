"use client"

import { useState, useCallback } from "react"
import Cropper from "react-easy-crop"
import type { Area } from "react-easy-crop"

interface Props {
  src: string
  onDone: (croppedBlob: Blob) => void
  onSkip: () => void
  onCancel: () => void
  index: number
  total: number
}

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = imageSrc
  })
  const canvas = document.createElement("canvas")
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")), "image/jpeg", 0.92)
  })
}

export function ImageCropper({ src, onDone, onSkip, onCancel, index, total }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [aspect, setAspect] = useState<"portrait" | "square">("portrait")
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels)
  }, [])

  async function handleDone() {
    if (!croppedArea) return
    setProcessing(true)
    const blob = await getCroppedBlob(src, croppedArea)
    onDone(blob)
  }

  const aspectRatio = aspect === "portrait" ? 3 / 4 : 1

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button type="button" onClick={onCancel} className="text-sm text-zinc-400 active:text-white">
          Annuler
        </button>
        <p className="text-sm font-semibold text-white">
          Recadrer{total > 1 ? ` (${index + 1}/${total})` : ""}
        </p>
        <button type="button" onClick={onSkip} className="text-sm text-zinc-400 active:text-white">
          Ignorer
        </button>
      </div>

      {/* Cropper — full remaining height */}
      <div className="relative flex-1">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={aspectRatio}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          showGrid={false}
          style={{ containerStyle: { background: "#000" } }}
        />
      </div>

      {/* Bottom controls */}
      <div className="shrink-0 px-4 pb-8 pt-3 space-y-3">
        {/* Aspect ratio toggle */}
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => { setAspect("portrait"); setZoom(1); setCrop({ x: 0, y: 0 }) }}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${aspect === "portrait" ? "bg-white text-black" : "bg-white/10 text-white"}`}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <rect x="5" y="2" width="14" height="20" rx="2" />
            </svg>
            4:3
          </button>
          <button
            type="button"
            onClick={() => { setAspect("square"); setZoom(1); setCrop({ x: 0, y: 0 }) }}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${aspect === "square" ? "bg-white text-black" : "bg-white/10 text-white"}`}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
            1:1
          </button>
        </div>

        {/* Zoom slider — hidden on touch devices */}
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="hidden md:block w-full accent-white"
        />

        {/* Confirm */}
        <button
          type="button"
          onClick={handleDone}
          disabled={processing}
          className="w-full rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {processing ? "Traitement…" : "Valider"}
        </button>
      </div>
    </div>
  )
}
