/** @type {import('next').NextConfig} */
const nextConfig = {
  sassOptions: {
    includePaths: ['./styles'],
  },
  // Allow Next/Image to optimize images served from Vercel Blob storage.
  // Assumption: your Vercel Blob URLs are served from a hostname under `vercel-storage.com`.
  // If your blob host differs, add its domain here.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        // allow both `vercel-storage.com` and subdomains like `project.vercel-storage.com`
        hostname: '**.vercel-storage.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'vercel-storage.com',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig
