"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { SecuritySettings } from "@/components/SecuritySettings"

interface Settings {
  siteTitle: string
  sitePublic: string
  profileName: string
  profileBio: string
  profileWebsite: string
  profileAvatar: string
  igUsername: string
  igFollowersCount: string
  igFollowsCount: string
  igUserId: string
  igAccessToken: string
}

const DEFAULTS: Settings = {
  siteTitle: "",
  sitePublic: "true",
  profileName: "",
  profileBio: "",
  profileWebsite: "",
  profileAvatar: "",
  igUsername: "",
  igFollowersCount: "0",
  igFollowsCount: "0",
  igUserId: "",
  igAccessToken: "",
}

export default function SettingsPage() {
  const [s, setS] = useState<Settings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const [uploading, setUploading] = useState(false)
  const [refreshingStats, setRefreshingStats] = useState(false)
  const [statsMsg, setStatsMsg] = useState("")
  const [showIgHelp, setShowIgHelp] = useState(false)
  const [showIgCredentials, setShowIgCredentials] = useState(false)
  const avatarRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setS((prev) => ({ ...prev, ...data })))
      .catch(() => setError("Erreur de chargement"))
      .finally(() => setLoading(false))
  }, [])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) throw new Error()
      const { path } = await res.json()
      setS((prev) => ({ ...prev, profileAvatar: path }))
    } catch {
      setError("Erreur lors de l'upload")
    } finally {
      setUploading(false)
    }
  }

  async function handleRefreshStats() {
    setRefreshingStats(true)
    setStatsMsg("")
    try {
      const res = await fetch("/api/instagram/stats", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setS((prev) => ({
        ...prev,
        igFollowersCount: String(data.followersCount),
        igFollowsCount: String(data.followsCount),
      }))
      setStatsMsg(`Mis à jour : ${data.followersCount} followers, ${data.followsCount} suivis`)
    } catch (err) {
      setStatsMsg(`Erreur : ${String(err)}`)
    } finally {
      setRefreshingStats(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")
    setSaved(false)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      })
      if (!res.ok) throw new Error()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError("Erreur lors de la sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    "w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"

  if (loading) return <p className="text-sm text-zinc-400">Chargement…</p>

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="mb-8 text-lg font-semibold dark:text-white">Paramètres</h2>

      <form onSubmit={handleSubmit} className="space-y-10">

        {/* ── Profil ── */}
        <section className="space-y-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Profil public</h3>

          {/* Avatar */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Photo de profil</label>
            <div className="flex items-center gap-4">
              <div
                className="relative h-16 w-16 cursor-pointer overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900"
                onClick={() => avatarRef.current?.click()}
              >
                {s.profileAvatar ? (
                  <Image src={s.profileAvatar} alt="Avatar" fill className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-400">
                    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>
                  </div>
                )}
              </div>
              <button type="button" onClick={() => avatarRef.current?.click()} disabled={uploading}
                className="text-sm font-medium text-blue-500 hover:text-blue-600 disabled:opacity-50">
                {uploading ? "Upload…" : "Changer la photo"}
              </button>
              <input type="file" accept="image/*" ref={avatarRef} onChange={handleAvatarChange} className="hidden" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Nom</label>
            <input type="text" value={s.profileName} onChange={(e) => setS({ ...s, profileName: e.target.value })} placeholder="Thibaud" className={inputClass} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Nom d'utilisateur</label>
            <input type="text" value={s.siteTitle} onChange={(e) => setS({ ...s, siteTitle: e.target.value })} placeholder="thiboad" className={inputClass} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Bio</label>
            <textarea value={s.profileBio} onChange={(e) => setS({ ...s, profileBio: e.target.value })} rows={4} maxLength={150}
              placeholder="À travers mes yeux et mes émotions…" className={inputClass} />
            <p className="mt-1 text-right text-xs text-zinc-400">{s.profileBio.length} / 150</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Site web</label>
            <input type="text" value={s.profileWebsite} onChange={(e) => setS({ ...s, profileWebsite: e.target.value })} placeholder="bandcamp.com/larkcrail" className={inputClass} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Handle Instagram <span className="text-zinc-400">(pour le lien vers votre vrai compte)</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">@</span>
              <input type="text" value={s.igUsername.replace(/^@/, "")}
                onChange={(e) => setS({ ...s, igUsername: e.target.value })}
                placeholder="thiboad" className={inputClass} />
            </div>
          </div>
        </section>

        {/* ── Visibilité ── */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Visibilité</h3>
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <div onClick={() => setS({ ...s, sitePublic: s.sitePublic === "true" ? "false" : "true" })}
              className={`relative h-5 w-9 rounded-full transition-colors ${s.sitePublic === "true" ? "bg-blue-500" : "bg-zinc-300 dark:bg-zinc-700"}`}>
              <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${s.sitePublic === "true" ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
            <span className="text-zinc-700 dark:text-zinc-300">
              {s.sitePublic === "true" ? "Wall public" : "Wall privé"}
            </span>
          </label>
        </section>

        {/* ── Instagram API ── */}
        <section className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Instagram Graph API</h3>
              <p className="mt-1 text-xs text-zinc-500">Pour publier sur Instagram et synchroniser les stats (followers, suivis).</p>
            </div>
            <button
              type="button"
              onClick={() => setShowIgHelp(!showIgHelp)}
              className="ml-2 text-xs text-blue-500 hover:text-blue-600 whitespace-nowrap"
            >
              {showIgHelp ? "Masquer aide" : "Aide ?"}
            </button>
          </div>

          {showIgHelp && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20 space-y-3">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                Comment récupérer vos identifiants Meta ?
              </p>
              <ol className="list-inside list-decimal space-y-2 text-xs text-blue-800 dark:text-blue-300">
                <li>
                  Allez sur{" "}
                  <a
                    href="https://developers.facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-600"
                  >
                    developers.facebook.com
                  </a>
                </li>
                <li>Créez une app Meta (App Type: Business)</li>
                <li>Ajoutez le produit "Instagram Graph API"</li>
                <li>Dans Settings → Basic, copiez l'<strong>App ID</strong></li>
                <li>
                  Créez un{" "}
                  <a
                    href="https://developers.facebook.com/docs/instagram-api/getting-started"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-600"
                  >
                    Access Token
                  </a>{" "}
                  (Tools → Access Token Generator)
                </li>
                <li>
                  Pour obtenir votre <strong>User ID Instagram</strong> : utilisez{" "}
                  <a
                    href="https://developers.facebook.com/tools/explorer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-600"
                  >
                    Graph API Explorer
                  </a>
                  , requête: <code className="bg-blue-900 px-1 py-0.5 rounded text-xs text-blue-100">me?fields=id,username</code>
                </li>
              </ol>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-3">
                💡 Le User ID est un numéro long (ex: 17841401907721223)
              </p>
            </div>
          )}

          {!showIgCredentials ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-900/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    🔒 Identifiants sensibles masqués
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                    Cliquez pour afficher vos identifiants Meta
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIgCredentials(true)}
                  className="ml-2 text-sm font-medium text-amber-700 hover:text-amber-800 dark:text-amber-200 dark:hover:text-amber-100 whitespace-nowrap"
                >
                  Afficher
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1 flex items-center justify-between text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  <span>User ID</span>
                  <button
                    type="button"
                    onClick={() => setShowIgCredentials(false)}
                    className="text-xs text-zinc-400 hover:text-zinc-500"
                  >
                    Masquer
                  </button>
                </label>
                <input
                  type="text"
                  value={s.igUserId}
                  onChange={(e) => setS({ ...s, igUserId: e.target.value })}
                  className={inputClass + " font-mono"}
                  placeholder="17841401907721223"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Access Token</label>
                <input
                  type="password"
                  value={s.igAccessToken}
                  onChange={(e) => setS({ ...s, igAccessToken: e.target.value })}
                  className={inputClass + " font-mono"}
                  placeholder="IGAB..."
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  ⚠️ Ne pas partager ce token. Il a accès à votre compte Instagram.
                </p>
              </div>
            </>
          )}

          {/* Stats en cache */}
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium dark:text-white">Stats en cache</p>
              <button type="button" onClick={handleRefreshStats} disabled={refreshingStats}
                className="text-xs font-medium text-blue-500 hover:text-blue-600 disabled:opacity-50">
                {refreshingStats ? "Actualisation…" : "Actualiser via API"}
              </button>
            </div>
            <div className="flex gap-6 text-sm">
              <div>
                <span className="font-semibold dark:text-white">{parseInt(s.igFollowersCount || "0").toLocaleString()}</span>
                <span className="ml-1 text-zinc-400">followers</span>
              </div>
              <div>
                <span className="font-semibold dark:text-white">{parseInt(s.igFollowsCount || "0").toLocaleString()}</span>
                <span className="ml-1 text-zinc-400">suivis</span>
              </div>
            </div>
            {statsMsg && <p className="mt-2 text-xs text-zinc-500">{statsMsg}</p>}
          </div>
        </section>


        {error && <p className="text-sm text-red-500">{error}</p>}
        {saved && <p className="text-sm text-green-500">Enregistré.</p>}

        <button type="submit" disabled={saving}
          className="w-full rounded-lg bg-blue-500 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50">
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>

      {/* ── Sécurité (hors form, pas de save global) ── */}
      <div className="mt-10 border-t border-zinc-200 pt-10 dark:border-zinc-800">
        <SecuritySettings />
      </div>
    </div>
  )
}
