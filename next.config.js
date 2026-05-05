/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow serving from /public/uploads (local) and Instagram CDN
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.cdninstagram.com",
      },
      {
        protocol: "https",
        hostname: "scontent**.fbcdn.net",
      },
    ],
  },
}

module.exports = nextConfig
