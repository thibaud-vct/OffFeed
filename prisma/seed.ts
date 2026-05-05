import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const defaults: Record<string, string> = {
  sitePublic: "true",
  siteTitle: "My Wall",
  igUserId: "",
  igAccessToken: "",
  // Profil
  profileName: "",
  profileBio: "",
  profileWebsite: "",
  profileAvatar: "",
  igUsername: "",
  igFollowersCount: "0",
  igFollowsCount: "0",
}

async function main() {
  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    })
  }
  console.log("Seed complete")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
