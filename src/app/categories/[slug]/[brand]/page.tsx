import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from '@/components/ExternalLink';

import { supabase } from '@/lib/supabase';
import DocCard from '@/components/DocCard';
import BreadcrumbJsonLd from '@/components/BreadcrumbJsonLd';
import { ChevronRight } from 'lucide-react';
import { getLocale, t } from '@/lib/locale';
import { SITE_URLS, tr, getCategoryName } from '@/lib/i18n';
import { headers } from 'next/headers';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

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
    .single();

  return { category, brand };
}

async function getDocuments(brandId: string, categoryId: string) {
  const { data } = await supabase
    .from('documents')
    .select('*, brand:brands(*), category:categories(*)')
    .eq('brand_id', brandId)
    .eq('category_id', categoryId)
    .eq('active', true)
    .order('title');
  return data || [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, brand } = await getCategoryAndBrand(params.slug, params.brand);
  if (!category || !brand) return {};

  const locale = (headers().get('x-locale') === 'fr' ? 'fr' : 'en') as 'en' | 'fr';
  const siteUrl = SITE_URLS[locale];
  const catName = getCategoryName(params.slug, category.name, locale);
  const serviceSuffix = tr(locale, 'category.service_manuals_suffix');
  const title = locale === 'fr'
    ? `${brand.name} ${catName} — Manuels de service | Guides de réparation`
    : `${brand.name} ${catName} Service Manuals | Repair Guides`;
  const description = locale === 'fr'
    ? `Téléchargez les manuels de service ${brand.name} pour ${catName.toLowerCase()}. Guides de réparation, schémas et documentation technique professionnelle.`
    : `Download ${brand.name} ${catName.toLowerCase()} service manuals. Professional repair guides, schematics, and technical documentation for ${brand.name} equipment.`;
  return {
    title,
    description,
    openGraph: {
      title: `${brand.name} ${category.name} ${serviceSuffix}`,
      description,
      url: `${siteUrl}/categories/${params.slug}/${params.brand}`,
    },
    alternates: {
      canonical: `${siteUrl}/categories/${params.slug}/${params.brand}`,
    },
  };
}

export default async function BrandPage({ params }: Props) {
  const { category, brand } = await getCategoryAndBrand(params.slug, params.brand);
  if (!category || !brand) notFound();

  const documents = await getDocuments(brand.id, category.id);

  const locale = getLocale();
  const siteUrl = SITE_URLS[locale];
  const catName = getCategoryName(category.slug, category.name, locale);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${brand.name} ${catName} ${tr(locale, 'category.service_manuals_suffix')}`,
    description: locale === 'fr'
      ? `Manuels de service et guides de réparation ${brand.name} ${catName.toLowerCase()} professionnels`
      : `Professional ${brand.name} ${catName.toLowerCase()} service manuals and repair guides`,
    url: `${siteUrl}/categories/${category.slug}/${brand.slug}`,
    numberOfItems: documents.length,
    about: {
      '@type': 'Brand',
      name: brand.name,
      logo: brand.logo_url || undefined,
    },
  };

  const breadcrumbs = [
    { name: tr(locale, 'category.home'), url: siteUrl },
    { name: tr(locale, 'category.categories'), url: `${siteUrl}/categories` },
    { name: catName, url: `${siteUrl}/categories/${category.slug}` },
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
          <Link href="/" className="hover:text-gray-700">{t('category.home')}</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/categories" className="hover:text-gray-700">{t('category.categories')}</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={`/categories/${category.slug}`} className="hover:text-gray-700">{catName}</Link>
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
            <h1 className="text-3xl font-bold text-gray-900">{brand.name} {t('category.service_manuals_suffix')}</h1>
            <p className="text-gray-500 mt-1">
              {locale === 'fr'
                ? `${documents.length} manuel${documents.length !== 1 ? 's' : ''} ${t('category.brand_subtitle_suffix')}`
                : `${documents.length} manual${documents.length !== 1 ? 's' : ''} ${t('category.brand_subtitle_suffix')}`}
            </p>
          </div>
        </div>

        {/* Documents grid */}
        {documents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {documents.map((doc: any) => (
              <DocCard key={doc.id} doc={doc} locale={locale} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 py-12 text-center">{t('category.no_manuals_for')} {brand.name}.</p>
        )}
      </div>
    </>
  );
}
