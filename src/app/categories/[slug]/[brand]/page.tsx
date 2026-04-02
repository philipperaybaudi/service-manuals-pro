import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from '@/components/ExternalLink';

export const runtime = 'edge';
import { supabase } from '@/lib/supabase';
import DocCard from '@/components/DocCard';
import BreadcrumbJsonLd from '@/components/BreadcrumbJsonLd';
import { ChevronRight } from 'lucide-react';

export const revalidate = 3600;

interface Props {
  params: { slug: string; brand: string };
}

async function getCategoryAndBrand(categorySlug: string, brandSlug: string) {
  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', categorySlug)
    .single();

  if (!category) return { category: null, brand: null };

  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('slug', brandSlug)
    .eq('category_id', category.id)
    .single();

  return { category, brand };
}

async function getDocuments(brandId: string) {
  const { data } = await supabase
    .from('documents')
    .select('*, brand:brands(*), category:categories(*)')
    .eq('brand_id', brandId)
    .eq('active', true)
    .order('title');
  return data || [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, brand } = await getCategoryAndBrand(params.slug, params.brand);
  if (!category || !brand) return {};

  return {
    title: `${brand.name} ${category.name} Service Manuals | Repair Guides`,
    description: `Download ${brand.name} ${category.name.toLowerCase()} service manuals. Professional repair guides, schematics, and technical documentation for ${brand.name} equipment.`,
    openGraph: {
      title: `${brand.name} ${category.name} Service Manuals`,
      description: `Professional ${brand.name} technical documentation for download`,
    },
  };
}

export default async function BrandPage({ params }: Props) {
  const { category, brand } = await getCategoryAndBrand(params.slug, params.brand);
  if (!category || !brand) notFound();

  const documents = await getDocuments(brand.id);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.service-manuals-pro.com';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${brand.name} ${category.name} Service Manuals`,
    description: `Professional ${brand.name} ${category.name.toLowerCase()} service manuals and repair guides`,
    url: `${siteUrl}/categories/${category.slug}/${brand.slug}`,
    numberOfItems: documents.length,
    about: {
      '@type': 'Brand',
      name: brand.name,
      logo: brand.logo_url || undefined,
    },
  };

  const breadcrumbs = [
    { name: 'Home', url: siteUrl },
    { name: 'Categories', url: `${siteUrl}/categories` },
    { name: category.name, url: `${siteUrl}/categories/${category.slug}` },
    { name: brand.name, url: `${siteUrl}/categories/${category.slug}/${brand.slug}` },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BreadcrumbJsonLd items={breadcrumbs} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
          <Link href="/" className="hover:text-gray-700">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/categories" className="hover:text-gray-700">Categories</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={`/categories/${category.slug}`} className="hover:text-gray-700">{category.name}</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-900 font-medium">{brand.name}</span>
        </nav>

        {/* Brand header */}
        <div className="flex items-center gap-4 mb-8">
          {brand.logo_url && (
            <div className="w-16 h-16 bg-white rounded-xl border border-gray-200 flex items-center justify-center p-2 shrink-0">
              <img src={brand.logo_url} alt={`${brand.name} logo`} className="max-w-full max-h-full object-contain" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{brand.name} Service Manuals</h1>
            <p className="text-gray-500 mt-1">
              {documents.length} manual{documents.length !== 1 ? 's' : ''} available for download
            </p>
          </div>
        </div>

        {/* Documents grid */}
        {documents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {documents.map((doc: any) => (
              <DocCard key={doc.id} doc={doc} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 py-12 text-center">No manuals available yet for {brand.name}.</p>
        )}
      </div>
    </>
  );
}
