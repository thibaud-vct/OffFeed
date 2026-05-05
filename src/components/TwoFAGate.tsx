"use client"

import { useState } from "react"

export function TwoFAGate({ children }: { children: React.ReactNode }) {
  const [qr, setQr] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"intro" | "scan" | "codes">("intro")
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [acknowledged, setAcknowledged] = useState(false)
  const [done, setDone] = useState(false)

  if (done) return <>{children}</>

  async function startSetup() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/totp/setup", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setQr(data.qr)
      setStep("scan")
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  async function confirmSetup() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/totp/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRecoveryCodes(data.recoveryCodes)
      setStep("codes")
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white px-4 dark:bg-black">
      <div className="w-full max-w-sm space-y-6">

        {step === "intro" && (
          <>
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <svg className="h-7 w-7 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold dark:text-white">Double authentification requise</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Pour accéder à l'administration, vous devez configurer la double authentification. Munissez-vous de Google Authenticator, Authy ou 1Password.
              </p>
            </div>
            {error && <p className="text-center text-sm text-red-500">{error}</p>}
            <button
              onClick={startSetup}
              disabled={loading}
              className="w-full rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "Génération…" : "Configurer maintenant"}
            </button>
          </>
        )}

        {step === "scan" && (
          <>
            <div className="text-center space-y-1">
              <h2 className="text-base font-semibold dark:text-white">Scannez ce QR code</h2>
              <p className="text-xs text-zinc-500">Code renouvelé toutes les 10 secondes</p>
            </div>
            {qr && (
              <div className="flex justify-center">
                <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700">
                  <img src={qr} alt="QR code 2FA" width={200} height={200} />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 text-center">Entrez le code affiché dans l'application :</p>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-3 text-center text-xl font-mono tracking-[0.5em] focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
              />
            </div>
            {error && <p className="text-center text-sm text-red-500">{error}</p>}
            <button
              onClick={confirmSetup}
              disabled={loading || code.length !== 6}
              className="w-full rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "Vérification…" : "Activer la 2FA"}
            </button>
          </>
        )}

        {step === "codes" && (
          <>
            <div className="text-center space-y-1">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <svg className="h-7 w-7 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-base font-semibold dark:text-white">2FA activée !</h2>
              <p className="text-xs text-zinc-500">
                Sauvegardez ces codes de secours. Chaque code ne peut être utilisé <strong>qu'une seule fois</strong>.
                Si vous perdez accès à votre application, ils sont votre seul recours.
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
              <div className="grid grid-cols-2 gap-1.5">
                {recoveryCodes.map((c) => (
                  <code key={c} className="block rounded bg-white px-2 py-1 text-center text-xs font-mono text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                    {c}
                  </code>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-blue-500"
              />
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                J'ai sauvegardé ces codes en lieu sûr (gestionnaire de mots de passe, papier…)
              </span>
            </label>

            <button
              onClick={() => setDone(true)}
              disabled={!acknowledged}
              className="w-full rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
            >
              Accéder à l'administration
            </button>
          </>
        )}
      </div>
    </div>
  )
}
