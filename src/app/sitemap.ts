import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.service-manuals-pro.com';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/categories`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.2 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.2 },
  ];

  // Categories
  const { data: categories } = await supabase.from('categories').select('slug, created_at');
  const categoryPages: MetadataRoute.Sitemap = (categories || []).map((cat) => ({
    url: `${baseUrl}/categories/${cat.slug}`,
    lastModified: new Date(cat.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Brands
  const { data: brands } = await supabase
    .from('brands')
    .select('slug, created_at, category:categories(slug)');
  const brandPages: MetadataRoute.Sitemap = (brands || []).map((brand: any) => ({
    url: `${baseUrl}/categories/${brand.category?.slug}/${brand.slug}`,
    lastModified: new Date(brand.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Documents
  const { data: docs } = await supabase
    .from('documents')
    .select('slug, updated_at')
    .eq('active', true);
  const docPages: MetadataRoute.Sitemap = (docs || []).map((doc) => ({
    url: `${baseUrl}/docs/${doc.slug}`,
    lastModified: new Date(doc.updated_at),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...categoryPages, ...brandPages, ...docPages];
}
