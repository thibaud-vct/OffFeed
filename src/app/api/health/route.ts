import { NextResponse } from "next/server"
import { initScheduler } from "@/lib/scheduler"

// Initialize scheduler on first request
let schedulerInitialized = false

export async function GET() {
  if (!schedulerInitialized) {
    await initScheduler()
    schedulerInitialized = true
  }

  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() })
}
