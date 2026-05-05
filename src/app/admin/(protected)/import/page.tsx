"use client"

import { useState } from "react"

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const fd = new FormData()
      fd.append("archive", file)
      const res = await fetch("/api/import", { method: "POST", body: fd })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? "Import failed")
      }
      setResult(await res.json())
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h2 className="mb-1 text-lg font-semibold">Import Instagram archive</h2>
        <p className="text-sm text-zinc-500">
          Download your data from{" "}
          <strong>Instagram → Settings → Your activity → Download your information</strong>.
          Upload the ZIP file below.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            Archive ZIP file
          </label>
          <input
            type="file"
            accept=".zip"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-zinc-500 file:mr-4 file:rounded file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:hover:bg-zinc-50"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {result && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <p>
              <strong>{result.imported}</strong> photos imported
              {result.skipped > 0 && (
                <>, <strong>{result.skipped}</strong> skipped (already exist or missing in archive)</>
              )}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={!file || loading}
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {loading ? "Importing…" : "Start import"}
        </button>
      </form>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 space-y-1">
        <p className="font-medium text-zinc-700">What gets imported</p>
        <ul className="list-inside list-disc space-y-0.5">
          <li>All photos from <code>media.json</code></li>
          <li>Original captions and dates</li>
          <li>Images saved to <code>public/uploads/</code></li>
          <li>Duplicate detection by filename — safe to re-run</li>
        </ul>
      </div>
    </div>
  )
}
