import type { Metadata, Viewport } from "next"
import "./globals.css"
import { PublicSessionProvider } from "@/components/PublicSessionProvider"

export const metadata: Metadata = {
  title: "OffFeed",
  description: "Personal photo wall",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <PublicSessionProvider>{children}</PublicSessionProvider>
      </body>
    </html>
  )
}
