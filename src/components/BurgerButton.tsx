"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"

export function BurgerButton() {
  const { data: session, status } = useSession()

  if (status === "loading") return <div className="w-24" />

  if (session) {
    return (
      <Link href="/admin/settings" className="flex h-8 w-8 items-center justify-center" aria-label="Paramètres">
        <svg className="h-6 w-6 dark:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </Link>
    )
  }

  return (
    <Link
      href="/admin/login"
      className="whitespace-nowrap rounded-xl bg-blue-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-600"
    >
      Se connecter
    </Link>
  )
}
