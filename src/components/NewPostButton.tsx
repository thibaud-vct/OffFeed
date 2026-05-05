"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"

export function NewPostButton() {
  const { data: session, status } = useSession()

  if (status === "loading" || !session) return <div className="h-8 w-8" />

  return (
    <Link href="/admin/new" className="flex h-8 w-8 items-center justify-center" aria-label="Nouveau post">
      <svg className="h-6 w-6 dark:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path strokeLinecap="round" d="M12 8v8M8 12h8" />
      </svg>
    </Link>
  )
}
