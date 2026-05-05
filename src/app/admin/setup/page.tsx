"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function SetupPage() {
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Check server-side if setup is allowed (no password set yet)
  useEffect(() => {
    fetch("/api/auth/setup")
      .then((r) => r.json())
      .then((d) => setAllowed(d.allowed))
      .catch(() => setAllowed(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas"); return }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push("/admin/login")
    } catch {
      setError("Erreur réseau")
    } finally {
      setLoading(false)
    }
  }

  if (allowed === null) return null

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-black">
        <p className="text-sm text-zinc-400">Configuration déjà effectuée.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 dark:bg-black">
      <div className="mb-8 flex flex-col items-center gap-2">
        <svg className="h-12 w-12 text-zinc-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
        <span className="text-xl font-semibold dark:text-white">OffFeed</span>
        <p className="text-sm text-zinc-400">Configuration initiale</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[350px] space-y-3 rounded-sm border border-zinc-200 bg-white p-10 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <p className="mb-4 text-xs text-zinc-500">
          Choisissez un mot de passe administrateur. Minimum 12 caractères avec majuscule, minuscule et chiffre ou symbole.
        </p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          className="w-full rounded border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirmer le mot de passe"
          className="w-full rounded border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500"
        />
        {error && <p className="text-center text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password || !confirm}
          className="w-full rounded bg-blue-500 py-1.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "Création…" : "Créer le compte"}
        </button>
      </form>
    </div>
  )
}
