/** @type {import('next').NextConfig} */
const nextConfig = {
  redirects: async () => [
    // Redirect any direct legacy page accesses to their Next.js equivalents
    {
      source: '/about/index.html',
      destination: '/about',
      permanent: false,
    },
    {
      source: '/faq/index.html',
      destination: '/faq',
      permanent: false,
    },
    {
      source: '/leaderboard/index.html',
      destination: '/leaderboard',
      permanent: false,
    },
  ],
}

export default nextConfig

