/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        // Sitemap index + tous les sous-sitemaps → cache CDN 24h
        source: '/(sitemap.xml|sitemap/:path*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/sitemap.xml',    destination: '/api/sitemap' },
        { source: '/sitemap/:page',  destination: '/api/sitemap/:page' },
      ],
      afterFiles: [
        { source: '/google62f56280efa85760.html', destination: '/api/google-verify' },
      ],
    };
  },
};

if (process.env.NODE_ENV === 'development') {
  const { setupDevPlatform } = await import('@cloudflare/next-on-pages/next-dev');
  await setupDevPlatform();
}

export default nextConfig;
