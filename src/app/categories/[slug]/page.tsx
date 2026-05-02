import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from '@/components/ExternalLink';

import { supabase } from '@/lib/supabase';
import BrandCard from '@/components/BrandCard';
import DocCard from '@/components/DocCard';
import CategorySidebar from '@/components/CategorySidebar';
import BreadcrumbJsonLd from '@/components/BreadcrumbJsonLd';
import { ChevronRight } from 'lucide-react';
import { getLocale, t } from '@/lib/locale';
import { SITE_URLS, tr, getCategoryName, getCategoryDescription } from '@/lib/i18n';
import { headers } from 'next/headers';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Documents visibles sur un seul site (filtrage par slug exact)
const FR_ONLY_SLUGS = new Set(['mini-cooper-rover-mini-manuel-de-reparation-akm6348']);
const EN_ONLY_SLUGS = new Set(['mini-cooper-rover-mini-repair-manual-akm6353']);
function isSiteVisible(slug: string, locale: string): boolean {
  if (FR_ONLY_SLUGS.has(slug)) return locale === 'fr';
  if (EN_ONLY_SLUGS.has(slug)) return locale === 'en';
  return true;
}

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

async function getBrands(categoryId: string, locale: string) {
  // Step 1: distinct brand_ids via documents in this category
  const { data: docs } = await supabase
    .from('documents')
    .select('brand_id, slug')
    .eq('category_id', categoryId)
    .eq('active', true);

  if (!docs || docs.length === 0) return [];

  const visibleDocs = docs.filter((d: any) => isSiteVisible(d.slug, locale));
  const brandIds = [...new Set(visibleDocs.map((d: any) => d.brand_id))];

  // Step 2: fetch brands
  const { data } = await supabase
    .from('brands')
    .select('id, name, slug, logo_url')
    .in('id', brandIds)
    .order('name');

  return (data || []).map((b: any) => ({
    ...b,
    document_count: visibleDocs.filter((d: any) => d.brand_id === b.id).length,
  }));
}

async function getDocuments(categoryId: string, locale: string) {
  const { data } = await supabase
    .from('documents')
    .select('*, brand:brands(*)')
    .eq('category_id', categoryId)
    .eq('active', true)
    .order('title')
    .limit(50);
  return (data || []).filter((doc: any) => isSiteVisible(doc.slug, locale));
}

async function getAllCategories(locale: string) {
  const { data } = await supabase
    .from('categories')
    .select('name, slug, documents(count)')
    .eq('documents.active', true)
    .order('display_order');
  return (data || [])
    .map((c: any) => ({
      name: c.name,
      slug: c.slug,
      documentCount: c.documents?.[0]?.count || 0,
    }))
    .sort((a: any, b: any) =>
      getCategoryName(a.slug, a.name, locale as any).localeCompare(
        getCategoryName(b.slug, b.name, locale as any),
        locale === 'fr' ? 'fr' : 'en'
      )
    );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategory(params.slug);
  if (!category) return {};

  const locale = (headers().get('x-locale') === 'fr' ? 'fr' : 'en') as 'en' | 'fr';
  const siteUrl = SITE_URLS[locale];
  const catName = getCategoryName(params.slug, category.name, locale);
  const catDesc = getCategoryDescription(params.slug, category.description, locale);
  const suffix = tr(locale, 'category.meta_title_suffix');
  const title = `${catName} ${suffix}`;
  const description = catDesc || tr(locale, 'category.meta_description_fallback');
  return {
    title,
    description,
    openGraph: {
      title: `${catName} ${tr(locale, 'category.service_manuals_suffix')}`,
      description,
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

  const locale = getLocale();
  const [brands, documents, allCategories] = await Promise.all([
    getBrands(category.id, locale),
    getDocuments(category.id, locale),
    getAllCategories(locale),
  ]);
  const siteUrl = SITE_URLS[locale];
  const catName = getCategoryName(category.slug, category.name, locale);
  const catDesc = getCategoryDescription(category.slug, category.description, locale);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${catName} ${tr(locale, 'category.service_manuals_suffix')}`,
    description: catDesc,
    url: `${siteUrl}/categories/${category.slug}`,
    numberOfItems: documents.length,
  };

  const breadcrumbs = [
    { name: tr(locale, 'category.home'), url: siteUrl },
    { name: tr(locale, 'category.categories'), url: `${siteUrl}/categories` },
    { name: catName, url: `${siteUrl}/categories/${category.slug}` },
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
          <Link href="/" className="hover:text-gray-700">{t('category.home')}</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/categories" className="hover:text-gray-700">{t('category.categories')}</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-900 font-medium">{catName}</span>
        </nav>

        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <CategorySidebar categories={allCategories} currentSlug={category.slug} />
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{catName} {t('category.service_manuals_suffix')}</h1>
            {catDesc && (
              <p className="text-gray-500 mb-8 max-w-2xl">{catDesc}</p>
            )}

            {/* Brands grid */}
            {brands.length > 0 && (
              <section className="mb-12">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('category.browse_by_brand')}</h2>
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
                {locale === 'fr'
                  ? `Tous les manuels ${catName} (${documents.length})`
                  : `All ${catName} Manuals (${documents.length})`}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {documents.map((doc: any) => (
                  <DocCard key={doc.id} doc={doc} locale={locale} />
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
