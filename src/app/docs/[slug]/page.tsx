import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from '@/components/ExternalLink';

import { supabase } from '@/lib/supabase';
import { formatPrice, fileSize } from '@/lib/utils';
import { ChevronRight, FileText, Download, Shield, Clock } from 'lucide-react';
import BuyButton from './BuyButton';
import BreadcrumbJsonLd from '@/components/BreadcrumbJsonLd';
import DownloadNotice from '@/components/DownloadNotice';
import { getLocale, t } from '@/lib/locale';
import { SITE_URLS, tr } from '@/lib/i18n';
import { headers } from 'next/headers';

export const runtime = 'edge';

export const revalidate = 3600;

interface Props {
  params: { slug: string };
}

async function getDocument(slug: string) {
  const { data } = await supabase
    .from('documents')
    .select('*, category:categories(*), brand:brands(*)')
    .eq('slug', slug)
    .eq('active', true)
    .single();
  return data;
}

async function getRelatedDocs(doc: any) {
  const { data } = await supabase
    .from('documents')
    .select('*, brand:brands(*)')
    .eq('active', true)
    .eq('category_id', doc.category_id)
    .neq('id', doc.id)
    .limit(4);
  return data || [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = await getDocument(params.slug);
  if (!doc) return {};

  const locale = (headers().get('x-locale') === 'fr' ? 'fr' : 'en') as 'en' | 'fr';
  const title = doc.seo_title || (locale === 'fr'
    ? `${doc.title} — Manuel de service PDF à télécharger`
    : `${doc.title} - Service Manual PDF Download`);
  const description = doc.seo_description || doc.description || (locale === 'fr'
    ? `Téléchargez le manuel de service ${doc.title}. Documentation technique professionnelle au format PDF.`
    : `Download ${doc.title} service manual. Professional technical documentation in PDF format.`);

  const siteUrl = SITE_URLS[locale];
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${siteUrl}/docs/${doc.slug}`,
      images: doc.preview_url ? [{ url: doc.preview_url, width: 1200, height: 630 }] : undefined,
    },
    alternates: {
      canonical: `${siteUrl}/docs/${doc.slug}`,
    },
  };
}

export default async function DocumentPage({ params }: Props) {
  const doc = await getDocument(params.slug);
  if (!doc) notFound();

  const related = await getRelatedDocs(doc);

  const locale = getLocale();
  const siteUrl = SITE_URLS[locale];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: doc.title,
    description: doc.description,
    image: doc.preview_url || undefined,
    brand: doc.brand ? { '@type': 'Brand', name: doc.brand.name } : undefined,
    offers: {
      '@type': 'Offer',
      price: (doc.price / 100).toFixed(2),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${siteUrl}/docs/${doc.slug}`,
    },
    category: doc.category?.name,
  };

  const breadcrumbs = [
    { name: tr(locale, 'category.home'), url: siteUrl },
    ...(doc.category ? [{ name: doc.category.name, url: `${siteUrl}/categories/${doc.category.slug}` }] : []),
    ...(doc.brand && doc.category ? [{ name: doc.brand.name, url: `${siteUrl}/categories/${doc.category.slug}/${doc.brand.slug}` }] : []),
    { name: doc.title, url: `${siteUrl}/docs/${doc.slug}` },
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
          {doc.category && (
            <>
              <Link href={`/categories/${doc.category.slug}`} className="hover:text-gray-700">
                {doc.category.name}
              </Link>
              <ChevronRight className="h-3 w-3" />
            </>
          )}
          {doc.brand && (
            <>
              <Link
                href={`/categories/${doc.category?.slug}/${doc.brand.slug}`}
                className="hover:text-gray-700"
              >
                {doc.brand.name}
              </Link>
              <ChevronRight className="h-3 w-3" />
            </>
          )}
          <span className="text-gray-900 font-medium line-clamp-1">{doc.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Preview + Description */}
          <div className="lg:col-span-2">
            {/* Preview */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
              <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                {doc.preview_url ? (
                  <img
                    src={doc.preview_url}
                    alt={`Preview of ${doc.title}`}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-gray-300">
                    <FileText className="h-20 w-20" />
                    <span className="text-sm">{t('doc.pdf_document')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">{doc.title}</h1>

              {doc.brand && (
                <div className="flex items-center gap-2 mb-4">
                  {doc.brand.logo_url && (
                    <img src={doc.brand.logo_url} alt={doc.brand.name} className="h-6 object-contain" />
                  )}
                  <span className="text-sm text-gray-600">{t('docpage.by')} {doc.brand.name}</span>
                </div>
              )}

              {doc.description && (
                <div
                  className="prose prose-sm text-gray-600 mb-6"
                  dangerouslySetInnerHTML={{ __html: doc.description }}
                />
              )}

              {/* Tags */}
              {doc.seo_tags && doc.seo_tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {doc.seo_tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Download notice */}
            <div className="mt-6">
              <DownloadNotice />
            </div>
          </div>

          {/* Right: Buy card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
              <div className="text-3xl font-bold text-gray-900 mb-4">
                {formatPrice(doc.price)}
              </div>

              <BuyButton documentId={doc.id} documentTitle={doc.title} price={doc.price} locale={locale} />

              <div className="space-y-3 mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Download className="h-4 w-4 text-gray-400 shrink-0" />
                  <span>{t('docpage.instant_download')}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                  <span>{t('docpage.link_valid_24h')}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Shield className="h-4 w-4 text-gray-400 shrink-0" />
                  <span>{t('docpage.stripe_secure')}</span>
                </div>
              </div>

              {/* Details */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('docpage.details')}</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">{t('docpage.format')}</dt>
                    <dd className="text-gray-900 font-medium">PDF</dd>
                  </div>
                  {doc.page_count && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">{t('docpage.pages')}</dt>
                      <dd className="text-gray-900 font-medium">{doc.page_count}</dd>
                    </div>
                  )}
                  {doc.file_size && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">{t('docpage.size')}</dt>
                      <dd className="text-gray-900 font-medium">{fileSize(doc.file_size)}</dd>
                    </div>
                  )}
                  {doc.language && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">{t('docpage.language')}</dt>
                      <dd className="text-gray-900 font-medium">{doc.language === 'en' ? (locale === 'fr' ? 'Anglais' : 'English') : doc.language}</dd>
                    </div>
                  )}
                  {doc.category && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">{t('docpage.category')}</dt>
                      <dd className="text-gray-900 font-medium">{doc.category.name}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{t('docpage.related')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {related.map((r: any) => (
                <Link
                  key={r.id}
                  href={`/docs/${r.slug}`}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{r.title}</h3>
                  {r.brand && <p className="text-xs text-gray-500 mt-1">{r.brand.name}</p>}
                  <p className="text-lg font-bold text-gray-900 mt-2">{formatPrice(r.price)}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
