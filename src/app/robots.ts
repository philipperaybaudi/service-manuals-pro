import { MetadataRoute } from 'next';
import { headers } from 'next/headers';

export const runtime = 'edge';

export default function robots(): MetadataRoute.Robots {
  const host = headers().get('host') ?? '';
  const baseUrl = host.includes('.fr')
    ? 'https://service-manuels-pro.fr'
    : 'https://service-manuals-pro.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/download/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
