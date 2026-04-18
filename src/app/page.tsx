import Link from '@/components/ExternalLink';
import { supabase } from '@/lib/supabase';
import SearchBar from '@/components/SearchBar';

import DocCard from '@/components/DocCard';
import CategoryCard from '@/components/CategoryCard';
import { FileText, Shield, Zap, Globe } from 'lucide-react';
import { getLocale, t } from '@/lib/locale';

export const runtime = 'edge';
export const revalidate = 3600;

async function getCategories() {
  const { data } = await supabase
    .from('categories')
    .select('*, brands(count), documents(count)')
    .eq('documents.active', true)
    .order('display_order');
  return data || [];
}

async function getFeaturedDocs() {
  // Only show manually selected featured documents
  const { data } = await supabase
    .from('documents')
    .select('*, category:categories(*), brand:brands(*)')
    .eq('active', true)
    .eq('featured', true)
    .order('title')
    .limit(8);
  return data || [];
}

async function getRecentDocs() {
  const { data } = await supabase
    .from('documents')
    .select('*, category:categories(*), brand:brands(*)')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(8);
  return data || [];
}

async function searchDocs(query: string) {
  // Supprimer les accents pour une recherche insensible aux accents
  // "Télescope" → "Telescope" → matche "Télescope" en base
  const normalized = query.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  // Chaque mot doit apparaître dans title OU title_fr (AND entre les mots)
  // → "Camera Craftsman" trouve les fiches dont title_fr contient les deux mots
  // → "Nikon F4" trouve "F4S" car F4 ⊂ F4S
  let req = supabase
    .from('documents')
    .select('*, category:categories(*), brand:brands(*)')
    .eq('active', true);

  for (const word of words) {
    req = req.or(`title.ilike.%${word}%,title_fr.ilike.%${word}%`);
  }

  const { data } = await req.limit(24);
  return data || [];
}

async function getStats() {
  const { count: docCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('active', true);
  const { count: brandCount } = await supabase
    .from('brands')
    .select('*', { count: 'exact', head: true });
  const { count: catCount } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true });
  return { documents: docCount || 0, brands: brandCount || 0, categories: catCount || 0 };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const locale = getLocale();
  const query = searchParams.q;

  if (query) {
    const results = await searchDocs(query);
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <SearchBar large defaultValue={query} locale={locale} />
        </div>
        <h1 className="text-2xl font-bold mb-2">
          {t('home.search_results_for')} &ldquo;{query}&rdquo;
        </h1>
        <p className="text-gray-500 mb-6">
          {results.length}{' '}
          {results.length !== 1 ? t('home.documents_found') : t('home.document_found')}
        </p>
        {results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {results.map((doc) => (
              <DocCard key={doc.id} doc={doc} showCategory />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <FileText className="h-16 w-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500">{t('home.no_results')}</p>
          </div>
        )}
      </div>
    );
  }

  const [categories, featured, recent, stats] = await Promise.all([
    getCategories(),
    getFeaturedDocs(),
    getRecentDocs(),
    getStats(),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-emerald-800 via-emerald-900 to-emerald-950 text-white overflow-hidden">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <p className="inline-block text-xs font-semibold uppercase tracking-widest text-emerald-300 bg-emerald-800/50 border border-emerald-600/30 rounded-full px-4 py-1.5 mb-6">
              {t('home.hero_badge')}
            </p>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              {t('home.hero_title_line1')}
              <span className="block text-emerald-300 mt-2">{t('home.hero_title_line2')}</span>
            </h1>
            <p className="text-lg text-emerald-100 mb-8 max-w-2xl mx-auto">
              {t('home.hero_subtitle')}
            </p>
            <div className="max-w-xl mx-auto">
              <SearchBar
                large
                placeholder={t('home.hero_search_placeholder')}
                locale={locale}
              />
            </div>
            <div className="flex items-center justify-center gap-6 sm:gap-8 mt-8 text-sm text-emerald-200">
              <div className="text-center">
                <span className="block text-2xl font-bold text-white">{stats.documents.toLocaleString()}+</span>
                <span className="text-xs text-emerald-300">{t('home.stats_manuals')}</span>
              </div>
              <div className="w-px h-10 bg-emerald-700" />
              <div className="text-center">
                <span className="block text-2xl font-bold text-white">{stats.brands}+</span>
                <span className="text-xs text-emerald-300">{t('home.stats_brands')}</span>
              </div>
              <div className="w-px h-10 bg-emerald-700" />
              <div className="text-center">
                <span className="block text-2xl font-bold text-white">{stats.categories}</span>
                <span className="text-xs text-emerald-300">{t('home.stats_categories')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3">
              <Zap className="h-7 w-7 text-emerald-700 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{t('home.trust_instant_title')}</p>
                <p className="text-xs text-gray-500">{t('home.trust_instant_desc')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3">
              <Shield className="h-7 w-7 text-emerald-700 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{t('home.trust_secure_title')}</p>
                <p className="text-xs text-gray-500">{t('home.trust_secure_desc')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3">
              <FileText className="h-7 w-7 text-emerald-700 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{t('home.trust_quality_title')}</p>
                <p className="text-xs text-gray-500">{t('home.trust_quality_desc')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3">
              <Globe className="h-7 w-7 text-emerald-700 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{t('home.trust_worldwide_title')}</p>
                <p className="text-xs text-gray-500">{t('home.trust_worldwide_desc')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('home.browse_title')}</h2>
            <p className="text-gray-500 mt-1">{t('home.browse_subtitle')}</p>
          </div>
          <Link href="/categories" className="text-sm text-emerald-700 hover:text-emerald-800 font-medium">
            {t('home.view_all')}
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat: any) => (
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
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section id="featured" className="bg-white border-y border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">{t('home.featured_title')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featured.map((doc: any) => (
                <DocCard key={doc.id} doc={doc} showCategory />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recent */}
      {recent.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">{t('home.recent_title')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {recent.map((doc: any) => (
              <DocCard key={doc.id} doc={doc} showCategory />
            ))}
          </div>
        </section>
      )}

      {/* SEO content */}
      <section className="bg-gray-100 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t('home.seo_title')}
          </h2>
          <div className="prose prose-sm text-gray-600 max-w-none columns-1 md:columns-2 gap-8">
            <p>{t('home.seo_p1')}</p>
            <p>{t('home.seo_p2')}</p>
            <p>{t('home.seo_p3')}</p>
          </div>
        </div>
      </section>
    </>
  );
}
