import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { SiteHeader } from "@/components/SiteHeader"
import SessionProvider from "@/components/SessionProvider"
import { TwoFAGate } from "@/components/TwoFAGate"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/admin/login")

  const settingRows = await prisma.setting.findMany({
    where: { key: { in: ["siteTitle", "igUsername", "totpEnabled"] } },
  })
  const s = Object.fromEntries(settingRows.map((r) => [r.key, r.value]))
  const username = s.siteTitle || "InstaWall"
  const igUsername = s.igUsername || ""
  const igUrl = igUsername ? `https://www.instagram.com/${igUsername.replace(/^@/, "")}/` : null
  const totpEnabled = s.totpEnabled === "true"

  return (
    <SessionProvider session={session}>
      <div className="min-h-screen bg-white dark:bg-black">
        <SiteHeader username={username} igUrl={igUrl} isAdmin />
        <main className="mx-auto max-w-2xl px-4 py-8">
          {totpEnabled ? children : <TwoFAGate>{children}</TwoFAGate>}
        </main>
      </div>
    </SessionProvider>
  )
}
