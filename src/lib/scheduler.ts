import * as cron from "node-cron"
import { prisma } from "./prisma"
import { getSetting } from "./settings"
import { publishScheduledPosts } from "./instagram"

let schedulerInstance: cron.ScheduledTask | null = null

export async function initScheduler() {
  if (schedulerInstance) return // Already initialized

  try {
    // Run every minute
    schedulerInstance = cron.schedule("* * * * *", async () => {
      try {
        const [accessToken, userId] = await Promise.all([
          getSetting("igAccessToken"),
          getSetting("igUserId"),
        ])

        // Only run if Instagram is configured
        if (!accessToken || !userId) return

        const { published, failed } = await publishScheduledPosts(accessToken, userId, prisma)

        if (published > 0 || failed > 0) {
          console.log(`[Scheduler] Completed: ${published} published, ${failed} failed`)
        }
      } catch (err) {
        console.error("[Scheduler] Error during scheduled check:", err)
      }
    })

    console.log("[Scheduler] Initialized - checking every minute for scheduled posts")
  } catch (err) {
    console.error("[Scheduler] Failed to initialize:", err)
  }
}

export function stopScheduler() {
  if (schedulerInstance) {
    schedulerInstance.stop()
    schedulerInstance = null
    console.log("[Scheduler] Stopped")
  }
}
