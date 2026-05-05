const BASE = "https://graph.instagram.com/v19.0"

type PublishResult = { igMediaId: string; igPermalink: string }

export async function publishSingleImage(
  imageUrl: string,
  caption: string,
  accessToken: string,
  userId: string,
): Promise<PublishResult> {
  // Step 1 — create container
  const containerRes = await fetch(
    `${BASE}/${userId}/media?image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(caption)}&access_token=${accessToken}`,
    { method: "POST" },
  )
  if (!containerRes.ok) {
    const err = await containerRes.text()
    throw new Error(`IG container creation failed: ${err}`)
  }
  const { id: containerId } = await containerRes.json()

  // Step 2 — publish
  const publishRes = await fetch(
    `${BASE}/${userId}/media_publish?creation_id=${containerId}&access_token=${accessToken}`,
    { method: "POST" },
  )
  if (!publishRes.ok) {
    const err = await publishRes.text()
    throw new Error(`IG publish failed: ${err}`)
  }
  const { id: igMediaId } = await publishRes.json()

  // Step 3 — fetch permalink
  const mediaRes = await fetch(
    `${BASE}/${igMediaId}?fields=permalink&access_token=${accessToken}`,
  )
  const { permalink } = await mediaRes.json()

  return { igMediaId, igPermalink: permalink }
}

export async function publishCarousel(
  imageUrls: string[],
  caption: string,
  accessToken: string,
  userId: string,
): Promise<PublishResult> {
  // Step 1 — create item containers
  const itemIds: string[] = []
  for (const url of imageUrls) {
    const res = await fetch(
      `${BASE}/${userId}/media?image_url=${encodeURIComponent(url)}&is_carousel_item=true&access_token=${accessToken}`,
      { method: "POST" },
    )
    if (!res.ok) throw new Error(`IG carousel item failed: ${await res.text()}`)
    const { id } = await res.json()
    itemIds.push(id)
  }

  // Step 2 — create carousel container
  const carouselRes = await fetch(
    `${BASE}/${userId}/media?media_type=CAROUSEL&children=${itemIds.join(",")}&caption=${encodeURIComponent(caption)}&access_token=${accessToken}`,
    { method: "POST" },
  )
  if (!carouselRes.ok) {
    throw new Error(`IG carousel container failed: ${await carouselRes.text()}`)
  }
  const { id: containerId } = await carouselRes.json()

  // Step 3 — publish
  const publishRes = await fetch(
    `${BASE}/${userId}/media_publish?creation_id=${containerId}&access_token=${accessToken}`,
    { method: "POST" },
  )
  if (!publishRes.ok) throw new Error(`IG carousel publish failed: ${await publishRes.text()}`)
  const { id: igMediaId } = await publishRes.json()

  const mediaRes = await fetch(
    `${BASE}/${igMediaId}?fields=permalink&access_token=${accessToken}`,
  )
  const { permalink } = await mediaRes.json()

  return { igMediaId, igPermalink: permalink }
}

export async function publishScheduledPosts(
  accessToken: string,
  userId: string,
  prisma: any,
): Promise<{ published: number; failed: number }> {
  const now = new Date()

  // Find all scheduled posts that are due for publishing
  const scheduledPosts = await prisma.post.findMany({
    where: {
      igScheduledAt: {
        lte: now,
      },
      igMediaId: null, // Not yet published
    },
  })

  let published = 0
  let failed = 0

  for (const post of scheduledPosts) {
    try {
      // Build absolute URL from imagePath
      const siteUrl = process.env.NEXTAUTH_URL ?? ""
      const mainUrl = post.imagePath.startsWith("http")
        ? post.imagePath
        : `${siteUrl}${post.imagePath}`

      const extras: string[] = JSON.parse(post.extraImages)

      let result: PublishResult
      if (extras.length > 0) {
        const allUrls = [mainUrl, ...extras.map((p: string) => (p.startsWith("http") ? p : `${siteUrl}${p}`))]
        result = await publishCarousel(allUrls, post.caption, accessToken, userId)
      } else {
        result = await publishSingleImage(mainUrl, post.caption, accessToken, userId)
      }

      // Update post with Instagram metadata and clear schedule
      await prisma.post.update({
        where: { id: post.id },
        data: {
          igMediaId: result.igMediaId,
          igPermalink: result.igPermalink,
          igScheduledAt: null,
        },
      })

      published++
      console.log(`[Scheduler] Published scheduled post ${post.id}`)
    } catch (err) {
      failed++
      console.error(`[Scheduler] Failed to publish post ${post.id}:`, err)
    }
  }

  return { published, failed }
}
