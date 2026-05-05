"use client"

import { useEffect, useState } from "react"

type TotpState = "idle" | "setup" | "confirming" | "enabled" | "disabling"
type PwState = "idle" | "entering" | "confirming" | "done"

export function SecuritySettings() {
  // ── 2FA ──────────────────────────────────────────────────
  const [totpState, setTotpState] = useState<TotpState>("idle")
  const [qrUrl, setQrUrl] = useState("")
  const [totpCode, setTotpCode] = useState("")
  const [totpError, setTotpError] = useState("")
  const [totpLoading, setTotpLoading] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [rcAck, setRcAck] = useState(false)

  // ── Mot de passe ─────────────────────────────────────────
  const [pwState, setPwState] = useState<PwState>("idle")
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [pwCode, setPwCode] = useState("")
  const [pwError, setPwError] = useState("")
  const [pwLoading, setPwLoading] = useState(false)

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      if (d.totpEnabled === "true") setTotpState("enabled")
    })
  }, [])

  // ── 2FA handlers ─────────────────────────────────────────

  async function startSetup() {
    setTotpLoading(true); setTotpError("")
    try {
      const res = await fetch("/api/auth/totp/setup", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setQrUrl(data.qr)
      setTotpState("setup")
    } catch (err) { setTotpError(String(err)) }
    finally { setTotpLoading(false) }
  }

  async function confirmSetup() {
    setTotpLoading(true); setTotpError("")
    try {
      const res = await fetch("/api/auth/totp/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: totpCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRecoveryCodes(data.recoveryCodes)
      setTotpState("confirming") // show recovery codes
      setTotpCode("")
    } catch (err) { setTotpError(String(err)) }
    finally { setTotpLoading(false) }
  }

  async function disableTotp() {
    setTotpLoading(true); setTotpError("")
    try {
      const res = await fetch("/api/auth/totp/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: totpCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTotpState("idle"); setTotpCode("")
    } catch (err) { setTotpError(String(err)) }
    finally { setTotpLoading(false) }
  }

  // ── Mot de passe handlers ─────────────────────────────────

  async function submitPasswordChange() {
    setPwLoading(true); setPwError("")
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPw, totpCode: pwCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPwState("done")
      setNewPw(""); setConfirmPw(""); setPwCode("")
    } catch (err) { setPwError(String(err)) }
    finally { setPwLoading(false) }
  }

  function goToConfirm() {
    if (newPw !== confirmPw) { setPwError("Les mots de passe ne correspondent pas"); return }
    setPwError(""); setPwState("confirming")
  }

  const inputClass = "w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"

  return (
    <div className="space-y-10">

      {/* ── Mot de passe ── */}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Mot de passe</h3>

        {pwState === "idle" && (
          <button type="button" onClick={() => setPwState("entering")}
            className="text-sm font-medium text-blue-500 hover:text-blue-600">
            Changer le mot de passe
          </button>
        )}

        {pwState === "entering" && (
          <div className="space-y-3">
            <input type="password" autoFocus value={newPw} onChange={(e) => setNewPw(e.target.value)}
              placeholder="Nouveau mot de passe (min. 12 caractères)" className={inputClass} />
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Confirmer le mot de passe" className={inputClass} />
            {pwError && <p className="text-xs text-red-500">{pwError}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={goToConfirm} disabled={!newPw || !confirmPw}
                className="rounded bg-blue-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50">
                Continuer
              </button>
              <button type="button" onClick={() => { setPwState("idle"); setPwError(""); setNewPw(""); setConfirmPw("") }}
                className="text-sm text-zinc-400 hover:text-zinc-600">Annuler</button>
            </div>
          </div>
        )}

        {pwState === "confirming" && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500">Entrez le code de votre application d'authentification pour confirmer le changement.</p>
            <input type="text" inputMode="numeric" autoFocus maxLength={6} value={pwCode}
              onChange={(e) => setPwCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className={inputClass + " font-mono tracking-widest text-center text-lg"} />
            {pwError && <p className="text-xs text-red-500">{pwError}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={submitPasswordChange} disabled={pwLoading || pwCode.length !== 6}
                className="rounded bg-blue-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50">
                {pwLoading ? "Vérification…" : "Confirmer"}
              </button>
              <button type="button" onClick={() => { setPwState("entering"); setPwError(""); setPwCode("") }}
                className="text-sm text-zinc-400 hover:text-zinc-600">← Retour</button>
            </div>
          </div>
        )}

        {pwState === "done" && (
          <div className="flex items-center gap-2 text-sm text-green-500">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Mot de passe modifié.
            <button type="button" onClick={() => setPwState("idle")} className="text-zinc-400 hover:text-zinc-600">OK</button>
          </div>
        )}
      </section>

      {/* ── 2FA ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Double authentification</h3>
          {totpState === "enabled" && (
            <span className="flex items-center gap-1 text-xs font-medium text-green-500">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Activée
            </span>
          )}
        </div>

        {totpState === "idle" && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">Configurez Google Authenticator, Authy ou 1Password. Code renouvelé toutes les 30 secondes.</p>
            <button type="button" onClick={startSetup} disabled={totpLoading}
              className="text-sm font-medium text-blue-500 hover:text-blue-600 disabled:opacity-50">
              {totpLoading ? "Chargement…" : "Activer la 2FA"}
            </button>
            {totpError && <p className="text-xs text-red-500">{totpError}</p>}
          </div>
        )}

        {totpState === "setup" && (
          <div className="space-y-4">
            <p className="text-xs text-zinc-500">Scannez ce QR code avec votre application :</p>
            {qrUrl && (
              <div className="inline-block rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700">
                <img src={qrUrl} alt="QR code 2FA" width={180} height={180} />
              </div>
            )}
            <input type="text" inputMode="numeric" autoFocus maxLength={6} value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className={inputClass + " font-mono tracking-widest text-center text-lg max-w-[160px]"} />
            {totpError && <p className="text-xs text-red-500">{totpError}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={confirmSetup} disabled={totpLoading || totpCode.length !== 6}
                className="rounded bg-blue-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50">
                {totpLoading ? "Vérification…" : "Activer"}
              </button>
              <button type="button" onClick={() => { setTotpState("idle"); setTotpCode(""); setQrUrl(""); setTotpError("") }}
                className="text-sm text-zinc-400 hover:text-zinc-600">Annuler</button>
            </div>
          </div>
        )}

        {/* Codes de secours affichés une seule fois après activation */}
        {totpState === "confirming" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="mb-3 text-xs font-semibold text-amber-700 dark:text-amber-400">
                Sauvegardez ces codes de secours — ils ne seront plus affichés.
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {recoveryCodes.map((c) => (
                  <code key={c} className="block rounded bg-white px-2 py-1 text-center text-xs font-mono text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                    {c}
                  </code>
                ))}
              </div>
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={rcAck} onChange={(e) => setRcAck(e.target.checked)}
                className="mt-0.5 accent-blue-500" />
              <span className="text-xs text-zinc-600 dark:text-zinc-400">J'ai sauvegardé ces codes en lieu sûr</span>
            </label>
            <button type="button" onClick={() => { setTotpState("enabled"); setRecoveryCodes([]); setRcAck(false) }}
              disabled={!rcAck}
              className="rounded bg-blue-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50">
              Terminer
            </button>
          </div>
        )}

        {totpState === "enabled" && (
          <button type="button" onClick={() => { setTotpState("disabling"); setTotpCode(""); setTotpError("") }}
            className="text-sm text-red-400 hover:text-red-600">
            Désactiver la 2FA
          </button>
        )}

        {totpState === "disabling" && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500">Entrez votre code actuel pour confirmer la désactivation :</p>
            <input type="text" inputMode="numeric" autoFocus maxLength={6} value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className={inputClass + " font-mono tracking-widest text-center text-lg max-w-[160px]"} />
            {totpError && <p className="text-xs text-red-500">{totpError}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={disableTotp} disabled={totpLoading || totpCode.length !== 6}
                className="rounded bg-red-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50">
                {totpLoading ? "…" : "Désactiver"}
              </button>
              <button type="button" onClick={() => { setTotpState("enabled"); setTotpCode(""); setTotpError("") }}
                className="text-sm text-zinc-400 hover:text-zinc-600">Annuler</button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
