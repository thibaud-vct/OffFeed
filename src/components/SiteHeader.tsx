"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { useState, useRef, useEffect } from "react"

interface Props {
  username: string
  igUrl: string | null
  isAdmin?: boolean
}

export function SiteHeader({ username, igUrl, isAdmin }: Props) {
  const { data: session, status } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Ferme le menu si clic extérieur
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  return (
    <header className="grid grid-cols-3 items-center px-4 py-3">
      {/* Gauche — + nouveau post (connecté uniquement) */}
      <div>
        {session ? (
          <Link href="/admin/new" className="flex h-8 w-8 items-center justify-center" aria-label="Nouveau post">
            <svg className="h-6 w-6 dark:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path strokeLinecap="round" d="M12 8v8M8 12h8" />
            </svg>
          </Link>
        ) : (
          <div className="h-8 w-8" />
        )}
      </div>

      {/* Centre — username + flèche IG */}
      <div className="flex justify-center">
        {igUrl ? (
          <a href={igUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
            <span className="text-base font-bold dark:text-white">{username}</span>
            <svg className="h-4 w-4 text-zinc-500 dark:text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </a>
        ) : (
          <span className="flex items-center gap-1 text-base font-bold dark:text-white">
            {username}
            <svg className="h-4 w-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        )}
      </div>

      {/* Droite — burger */}
      <div className="flex justify-end" ref={menuRef}>
        {status === "loading" ? (
          <div className="h-8 w-8" />
        ) : session ? (
          /* Connecté → burger avec menu déroulant */
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-8 w-8 items-center justify-center"
              aria-label="Menu"
            >
              <svg className="h-6 w-6 dark:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-10 z-50 min-w-[160px] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
                {isAdmin && (
                  <Link
                    href="/"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 dark:text-white"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Retour au wall
                  </Link>
                )}
                <Link
                  href="/admin/import"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 dark:text-white"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 8l-3-3m3 3l3-3" />
                  </svg>
                  <span className="whitespace-nowrap">Importer archive</span>
                </Link>
                <Link
                  href="/admin/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 dark:text-white"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" />
                  </svg>
                  Paramètres
                </Link>
                <div className="border-t border-zinc-100 dark:border-zinc-800" />
                <button
                  onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/" }) }}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-red-500 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="whitespace-nowrap">Se déconnecter</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Non connecté → bouton Se connecter */
          <Link
            href="/admin/login"
            className="whitespace-nowrap rounded-xl bg-blue-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-600"
          >
            Se connecter
          </Link>
        )}
      </div>
    </header>
  )
}
