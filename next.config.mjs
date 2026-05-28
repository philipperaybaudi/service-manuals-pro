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
  async redirects() {
    return [
    { source: '/docs/dell-dell-inspiron-15-3531-service-manual-vi', destination: '/docs/dell-dell-inspiron-15-3531-service-manual', permanent: true },
    { source: '/docs/dell-alienware-17-r5-configuration-and-specifications-da', destination: '/docs/dell-alienware-17-r5-configuration-and-specifications', permanent: true },
    { source: '/docs/dell-alienware-15-r4-service-manual-no', destination: '/docs/dell-alienware-15-r4-service-manual', permanent: true },
    { source: '/docs/dell-dell-g7-15-service-manual-ko-3', destination: '/docs/dell-dell-g7-15-service-manual', permanent: true },
    { source: '/docs/dell-dell-g7-15-service-manual-id', destination: '/docs/dell-dell-g7-15-service-manual', permanent: true },
    { source: '/docs/dell-dell-g7-15-service-manual-ko-2', destination: '/docs/dell-dell-g7-15-service-manual', permanent: true },
    { source: '/docs/dell-alienware-15-r4-service-manual-nl', destination: '/docs/dell-alienware-15-r4-service-manual', permanent: true },
    { source: '/docs/dell-alienware-15-r4-service-manual-fr', destination: '/docs/dell-alienware-15-r4-service-manual', permanent: true },
    { source: '/docs/dell-alienware-15-r4-service-manual-it', destination: '/docs/dell-alienware-15-r4-service-manual', permanent: true },
    { source: '/docs/dell-dell-inspiron-14-5458-service-manual-de', destination: '/docs/dell-dell-inspiron-14-5458-service-manual', permanent: true },
    { source: '/docs/dell-dell-latitude-13-service-manual-vi', destination: '/docs/dell-dell-latitude-13-service-manual', permanent: true },
    { source: '/docs/dell-alienware-m17-r3-service-manual-de', destination: '/docs/dell-alienware-m17-r3-service-manual', permanent: true },
    { source: '/docs/dell-dell-inspiron-14-5455-service-manual-de', destination: '/docs/dell-dell-inspiron-14-5455-service-manual', permanent: true },
    { source: '/docs/dell-dell-inspiron-13-5378-2-in-1-service-manual-tr', destination: '/docs/dell-dell-inspiron-13-5378-2-in-1-service-manual', permanent: true },
    { source: '/docs/dell-alienware-15-r3-service-manual-de-5', destination: '/docs/dell-alienware-15-r3-service-manual', permanent: true },
    { source: '/docs/dell-dell-inspiron-15-3551-service-manual-ca', destination: '/docs/dell-dell-inspiron-15-3551-service-manual', permanent: true },
    { source: '/docs/dell-alienware-15-r3-setup-and-specifications-de-2', destination: '/docs/dell-alienware-15-r3-setup-and-specifications', permanent: true },
    { source: '/docs/dell-dell-inspiron-15-3555-service-manual-de', destination: '/docs/dell-dell-inspiron-15-3555-service-manual', permanent: true },
    { source: '/docs/dell-dell-inspiron-17-5759-service-manual-ca-2', destination: '/docs/dell-dell-inspiron-17-5759-service-manual', permanent: true },
    { source: '/docs/dell-dell-inspiron-15-5567-service-manual-it', destination: '/docs/dell-dell-inspiron-15-5567-service-manual', permanent: true },
    { source: '/docs/dell-dell-inspiron-15-3552-service-manual-ca', destination: '/docs/dell-dell-inspiron-15-3552-service-manual', permanent: true },
    { source: '/docs/dell-dell-inspiron-11-3152-service-manual-de', destination: '/docs/dell-dell-inspiron-11-3152-service-manual', permanent: true },
    { source: '/docs/dell-dell-inspiron-17-5759-service-manual-ca', destination: '/docs/dell-dell-inspiron-17-5759-service-manual', permanent: true },
    { source: '/docs/dell-alienware-15-r3-service-manual-de-4', destination: '/docs/dell-alienware-15-r3-service-manual', permanent: true },
    { source: '/docs/dell-dell-inspiron-11-3000-setup-and-specifications-vi', destination: '/docs/dell-dell-inspiron-11-3000-setup-and-specifications', permanent: true },
    { source: '/docs/dell-dell-latitude-e4300-service-manual-vi', destination: '/docs/dell-dell-latitude-e4300-service-manual', permanent: true },
    { source: '/docs/dell-dell-inspiron-14-3473-setup-and-specifications-vi', destination: '/docs/dell-dell-inspiron-14-3473-setup-and-specifications', permanent: true },
    { source: '/docs/dell-dell-latitude-2120-service-manual-vi', destination: '/docs/dell-dell-latitude-2120-service-manual', permanent: true },
    { source: '/docs/dell-alienware-15-r3-service-manual-de-2', destination: '/docs/dell-alienware-15-r3-service-manual', permanent: true },
    { source: '/docs/dell-dell-g5-15-5587-setup-and-specifications-no', destination: '/docs/dell-dell-g5-15-5587-setup-and-specifications', permanent: true },
    { source: '/docs/dell-dell-inspiron-15-3552-service-manual-de', destination: '/docs/dell-dell-inspiron-15-3552-service-manual', permanent: true },
    { source: '/docs/dell-dell-inspiron-14-5455-service-manual-de-2', destination: '/docs/dell-dell-inspiron-14-5455-service-manual', permanent: true },
    { source: '/docs/dell-dell-inspiron-15-5567-service-manual-et', destination: '/docs/dell-dell-inspiron-15-5567-service-manual', permanent: true },
    { source: '/docs/dell-dell-inspiron-13-7370-setup-and-specifications-de', destination: '/docs/dell-dell-inspiron-13-7370-setup-and-specifications', permanent: true },
    { source: '/docs/dell-dell-inspiron-5570-service-manual-tr', destination: '/docs/dell-dell-inspiron-5570-service-manual', permanent: true },
    { source: '/docs/dell-dell-inspiron-11-3169-service-manual-de-2', destination: '/docs/dell-dell-inspiron-11-3169-service-manual', permanent: true },
    { source: '/docs/dell-dell-g5-15-service-manual-no', destination: '/docs/dell-dell-g5-15-service-manual', permanent: true },
    { source: '/docs/dell-dell-inspiron-17-5759-service-manual-de', destination: '/docs/dell-dell-inspiron-17-5759-service-manual', permanent: true },
    { source: '/docs/dell-dell-inspiron-15-5567-service-manual-vi', destination: '/docs/dell-dell-inspiron-15-5567-service-manual', permanent: true },
    { source: '/docs/dell-dell-latitude-e4200-service-manual-vi', destination: '/docs/dell-dell-latitude-e4200-service-manual', permanent: true },
    { source: '/docs/dell-dell-inspiron-5370-service-manual-ca', destination: '/docs/dell-dell-inspiron-5370-service-manual', permanent: true },
    { source: '/docs/dell-dell-inspiron-15-3531-service-manual-sl-2', destination: '/docs/dell-dell-inspiron-15-3531-service-manual', permanent: true },
    { source: '/docs/dell-dell-inspiron-15-3555-service-manual-ca', destination: '/docs/dell-dell-inspiron-15-3555-service-manual', permanent: true },
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
