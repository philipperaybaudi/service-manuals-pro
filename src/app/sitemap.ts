import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { headers } from 'next/headers';
import { SITE_URLS } from '@/lib/i18n';

export const runtime = 'edge';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const xLocale = headers().get('x-locale');
  const host = headers().get('host') ?? '';
  const locale = (xLocale === 'fr' || host.includes('service-manuels-pro.fr') ? 'fr' : 'en') as 'en' | 'fr';
  const baseUrl = SITE_URLS[locale];

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/categories`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.2 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.2 },
  ];

  // Categories (≤ 100, pas de risque de troncature)
  const { data: categories } = await supabase
    .from('categories')
    .select('slug, created_at')
    .limit(500);
  const categoryPages: MetadataRoute.Sitemap = (categories || []).map((cat) => ({
    url: `${baseUrl}/categories/${cat.slug}`,
    lastModified: new Date(cat.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Brands — paginé (peut dépasser 1000)
  const allBrands: any[] = [];
  {
    let from = 0;
    while (true) {
      const { data } = await supabase
        .from('brands')
        .select('slug, created_at, category:categories(slug)')
        .range(from, from + 999);
      if (!data || data.length === 0) break;
      allBrands.push(...data);
      if (data.length < 1000) break;
      from += 1000;
    }
  }
  const brandPages: MetadataRoute.Sitemap = allBrands.map((brand: any) => ({
    url: `${baseUrl}/categories/${brand.category?.slug}/${brand.slug}`,
    lastModified: new Date(brand.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Documents — paginé (critique : 2974+ docs, sitemap tronquée sans ça)
  const allDocs: any[] = [];
  {
    let from = 0;
    while (true) {
      const { data } = await supabase
        .from('documents')
        .select('slug, updated_at')
        .eq('active', true)
        .range(from, from + 999);
      if (!data || data.length === 0) break;
      allDocs.push(...data);
      if (data.length < 1000) break;
      from += 1000;
    }
  }
  const docPages: MetadataRoute.Sitemap = allDocs.map((doc) => ({
    url: `${baseUrl}/docs/${doc.slug}`,
    lastModified: new Date(doc.updated_at),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...categoryPages, ...brandPages, ...docPages];
}
