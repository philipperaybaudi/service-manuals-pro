import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';

import CategoryCard from '@/components/CategoryCard';
import { getLocale, t } from '@/lib/locale';
import { SITE_URLS, tr, getCategoryName } from '@/lib/i18n';
import { headers } from 'next/headers';

export const runtime = 'edge';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (headers().get('x-locale') === 'fr' ? 'fr' : 'en') as 'en' | 'fr';
  const title = locale === 'fr'
    ? 'Toutes les catégories | Parcourir la documentation technique'
    : 'All Categories | Browse Technical Documentation';
  const description = locale === 'fr'
    ? 'Parcourez toutes les catégories de manuels de service professionnels et de documentation technique. Trouvez guides de réparation, schémas et manuels d\u2019atelier classés par type d\u2019équipement.'
    : 'Browse all categories of professional service manuals and technical documentation. Find repair guides, schematics, and workshop manuals organized by equipment type.';
  const base = SITE_URLS[locale];
  return {
    title,
    description,
    openGraph: { title, description, url: `${base}/categories` },
    alternates: { canonical: `${base}/categories` },
  };
}

export const revalidate = 3600;

export default async function CategoriesPage() {
  const locale = getLocale();
  const { data: categoriesRaw } = await supabase
    .from('categories')
    .select('*, brands(count), documents(count)')
    .eq('documents.active', true)
    .order('display_order');
  const categories = [...(categoriesRaw || [])].sort((a, b) =>
    getCategoryName(a.slug, a.name, locale).localeCompare(
      getCategoryName(b.slug, b.name, locale),
      locale === 'fr' ? 'fr' : 'en'
    )
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('categories.title')}</h1>
      <p className="text-gray-500 mb-8">{t('categories.subtitle')}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(categories || []).map((cat: any) => (
          <CategoryCard
            key={cat.id}
            name={cat.name}
            slug={cat.slug}
            description={cat.description || ''}
            documentCount={cat.documents?.[0]?.count || 0}
            brandCount={cat.brands?.[0]?.count || 0}
          />
        ))}
      </div>
    </div>
  );
}
