import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from '@/components/ExternalLink';

export const runtime = 'edge';
import { supabase } from '@/lib/supabase';
import BrandCard from '@/components/BrandCard';
import DocCard from '@/components/DocCard';
import CategorySidebar from '@/components/CategorySidebar';
import BreadcrumbJsonLd from '@/components/BreadcrumbJsonLd';
import { ChevronRight } from 'lucide-react';

export const revalidate = 3600;

interface Props {
  params: { slug: string };
}

async function getCategory(slug: string) {
  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single();
  return data;
}

async function getBrands(categoryId: string) {
  const { data } = await supabase
    .from('brands')
    .select('*')
    .eq('category_id', categoryId)
    .order('name');
  return data || [];
}

async function getDocuments(categoryId: string) {
  const { data } = await supabase
    .from('documents')
    .select('*, brand:brands(*)')
    .eq('category_id', categoryId)
    .eq('active', true)
    .order('title')
    .limit(50);
  return data || [];
}

async function getAllCategories() {
  const { data } = await supabase
    .from('categories')
    .select('name, slug, documents(count)')
    .eq('documents.active', true)
    .order('name');
  return (data || []).map((c: any) => ({
    name: c.name,
    slug: c.slug,
    documentCount: c.documents?.[0]?.count || 0,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategory(params.slug);
  if (!category) return {};

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.service-manuals-pro.com';
  return {
    title: `${category.name} Service Manuals | Repair Guides & Schematics`,
    description: category.description || `Download professional ${category.name.toLowerCase()} service manuals. Repair guides, schematics, and technical documentation.`,
    openGraph: {
      title: `${category.name} Service Manuals`,
      description: category.description || `Professional ${category.name.toLowerCase()} technical documentation`,
      url: `${siteUrl}/categories/${params.slug}`,
    },
    alternates: {
      canonical: `${siteUrl}/categories/${params.slug}`,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const category = await getCategory(params.slug);
  if (!category) notFound();

  const [brands, documents, allCategories] = await Promise.all([
    getBrands(category.id),
    getDocuments(category.id),
    getAllCategories(),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.service-manuals-pro.com';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.name} Service Manuals`,
    description: category.description,
    url: `${siteUrl}/categories/${category.slug}`,
    numberOfItems: documents.length,
  };

  const breadcrumbs = [
    { name: 'Home', url: siteUrl },
    { name: 'Categories', url: `${siteUrl}/categories` },
    { name: category.name, url: `${siteUrl}/categories/${category.slug}` },
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
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-gray-700">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/categories" className="hover:text-gray-700">Categories</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-900 font-medium">{category.name}</span>
        </nav>

        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <CategorySidebar categories={allCategories} currentSlug={category.slug} />
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{category.name} Service Manuals</h1>
            {category.description && (
              <p className="text-gray-500 mb-8 max-w-2xl">{category.description}</p>
            )}

            {/* Brands grid */}
            {brands.length > 0 && (
              <section className="mb-12">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Browse by Brand</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {brands.map((brand: any) => (
                    <BrandCard
                      key={brand.id}
                      name={brand.name}
                      slug={brand.slug}
                      categorySlug={category.slug}
                      logoUrl={brand.logo_url}
                      documentCount={brand.document_count}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* All documents */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                All {category.name} Manuals ({documents.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {documents.map((doc: any) => (
                  <DocCard key={doc.id} doc={doc} />
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
