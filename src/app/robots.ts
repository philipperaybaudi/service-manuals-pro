import { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { SITE_URLS } from '@/lib/i18n';

export const runtime = 'edge';

export default function robots(): MetadataRoute.Robots {
  const locale = (headers().get('x-locale') === 'fr' ? 'fr' : 'en') as 'en' | 'fr';
  const baseUrl = SITE_URLS[locale];

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
