"use client"

import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState, Suspense } from "react"
import Link from "next/link"

type Step = "password" | "totp" | "recovery"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/"

  useEffect(() => {
    fetch("/api/auth/setup").then((r) => r.json()).then((d) => {
      if (d.allowed) router.replace("/admin/setup")
    })
  }, [router])

  const [step, setStep] = useState<Step>("password")
  const [password, setPassword] = useState("")
  const [totpCode, setTotpCode] = useState("")
  const [recoveryCode, setRecoveryCode] = useState("")
  const [preToken, setPreToken] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const totpRef = useRef<HTMLInputElement>(null)

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/pre-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Mot de passe incorrect"); return }
      if (data.requires2FA) {
        setPreToken(data.preToken)
        setStep("totp")
        setTimeout(() => totpRef.current?.focus(), 50)
      } else {
        await completeLogin(data.preToken)
      }
    } catch {
      setError("Erreur réseau")
    } finally {
      setLoading(false)
    }
  }

  async function handleTotpSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await completeLogin(preToken, totpCode)
    } finally {
      setLoading(false)
    }
  }

  async function completeLogin(token: string, totp?: string) {
    const result = await signIn("credentials", {
      preToken: token,
      ...(totp ? { totpCode: totp } : {}),
      redirect: false,
    })
    if (result?.error) {
      setError(totp ? "Code incorrect" : "Identifiants invalides")
    } else {
      router.push(callbackUrl)
    }
  }

  async function handleRecoverySubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/totp/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: recoveryCode }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      await completeLogin(data.preToken)
    } catch {
      setError("Erreur réseau")
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full rounded border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500"

  return (
    <div className="w-full max-w-[350px] space-y-2">
      <div className="rounded-sm border border-zinc-200 bg-white p-10 dark:border-zinc-800 dark:bg-zinc-950">
        {step === "password" ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <input type="password" autoFocus value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe" className={inputClass} />
            {error && <p className="text-center text-xs text-red-500">{error}</p>}
            <button type="submit" disabled={loading || !password}
              className="w-full rounded bg-blue-500 py-1.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50">
              {loading ? "Vérification…" : "Continuer"}
            </button>
          </form>
        ) : step === "totp" ? (
          <form onSubmit={handleTotpSubmit} className="space-y-3">
            <p className="mb-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Entrez le code de votre application d'authentification
            </p>
            <input ref={totpRef} type="text" inputMode="numeric" autoComplete="one-time-code"
              maxLength={6} value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full rounded border border-zinc-300 bg-zinc-50 px-3 py-2 text-center text-xl font-mono tracking-[0.5em] focus:border-zinc-400 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" />
            {error && <p className="text-center text-xs text-red-500">{error}</p>}
            <button type="submit" disabled={loading || totpCode.length !== 6}
              className="w-full rounded bg-blue-500 py-1.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50">
              {loading ? "Vérification…" : "Se connecter"}
            </button>
            <div className="flex justify-between">
              <button type="button" onClick={() => { setStep("password"); setTotpCode(""); setError("") }}
                className="text-xs text-zinc-400 hover:text-zinc-600">← Retour</button>
              <button type="button" onClick={() => { setStep("recovery"); setError("") }}
                className="text-xs text-zinc-400 hover:text-zinc-600">Code de secours</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRecoverySubmit} className="space-y-3">
            <p className="mb-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Entrez un code de secours à usage unique
            </p>
            <input type="text" autoFocus autoComplete="off" value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
              placeholder="XXXXX-XXXXX-XXXXX"
              className="w-full rounded border border-zinc-300 bg-zinc-50 px-3 py-2 text-center font-mono text-sm tracking-wider focus:border-zinc-400 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" />
            {error && <p className="text-center text-xs text-red-500">{error}</p>}
            <button type="submit" disabled={loading || recoveryCode.length < 5}
              className="w-full rounded bg-blue-500 py-1.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50">
              {loading ? "Vérification…" : "Utiliser ce code"}
            </button>
            <button type="button" onClick={() => { setStep("totp"); setRecoveryCode(""); setError("") }}
              className="w-full text-center text-xs text-zinc-400 hover:text-zinc-600">← Retour</button>
          </form>
        )}
      </div>

      <div className="rounded-sm border border-zinc-200 bg-white py-4 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
          ← Retour au wall
        </Link>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 dark:bg-black">
      <div className="mb-8 flex flex-col items-center gap-2">
        <svg className="h-12 w-12 text-zinc-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
        <span className="text-xl font-semibold dark:text-white">InstaWall</span>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  )
}
