import Link from '@/components/ExternalLink';
import { supabase } from '@/lib/supabase';
import SearchBar from '@/components/SearchBar';

import DocCard from '@/components/DocCard';
import CategoryCard from '@/components/CategoryCard';
import { FileText, Shield, Zap, Globe } from 'lucide-react';

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
  // Fetch the 4 manuals from the photography/collection brand
  const { data: brandData } = await supabase
    .from('brands')
    .select('id, category:categories!inner(slug)')
    .eq('slug', 'collection')
    .eq('categories.slug', 'photography')
    .single();

  if (brandData) {
    const { data } = await supabase
      .from('documents')
      .select('*, category:categories(*), brand:brands(*)')
      .eq('active', true)
      .eq('brand_id', brandData.id)
      .order('title')
      .limit(4);
    if (data && data.length > 0) return data;
  }

  // Fallback: any featured documents
  const { data } = await supabase
    .from('documents')
    .select('*, category:categories(*), brand:brands(*)')
    .eq('active', true)
    .eq('featured', true)
    .limit(4);
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
  const { data } = await supabase
    .from('documents')
    .select('*, category:categories(*), brand:brands(*)')
    .eq('active', true)
    .textSearch('fts', query, { type: 'websearch' })
    .limit(24);
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
  const query = searchParams.q;

  if (query) {
    const results = await searchDocs(query);
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <SearchBar large defaultValue={query} />
        </div>
        <h1 className="text-2xl font-bold mb-2">
          Search results for &ldquo;{query}&rdquo;
        </h1>
        <p className="text-gray-500 mb-6">{results.length} document{results.length !== 1 ? 's' : ''} found</p>
        {results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {results.map((doc) => (
              <DocCard key={doc.id} doc={doc} showCategory />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <FileText className="h-16 w-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500">No documents found. Try different keywords.</p>
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
              Right to Repair — Access Technical Documentation
            </p>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              Professional Service Manuals
              <span className="block text-emerald-300 mt-2">Instant PDF Download</span>
            </h1>
            <p className="text-lg text-emerald-100 mb-8 max-w-2xl mx-auto">
              The world&apos;s largest collection of technical documentation.
              Repair guides, schematics, and workshop manuals for professionals and enthusiasts.
            </p>
            <div className="max-w-xl mx-auto">
              <SearchBar
                large
                placeholder="Search by brand, model, or keyword..."
              />
            </div>
            <div className="flex items-center justify-center gap-6 sm:gap-8 mt-8 text-sm text-emerald-200">
              <div className="text-center">
                <span className="block text-2xl font-bold text-white">{stats.documents.toLocaleString()}+</span>
                <span className="text-xs text-emerald-300">Manuals</span>
              </div>
              <div className="w-px h-10 bg-emerald-700" />
              <div className="text-center">
                <span className="block text-2xl font-bold text-white">{stats.brands}+</span>
                <span className="text-xs text-emerald-300">Brands</span>
              </div>
              <div className="w-px h-10 bg-emerald-700" />
              <div className="text-center">
                <span className="block text-2xl font-bold text-white">{stats.categories}</span>
                <span className="text-xs text-emerald-300">Categories</span>
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
                <p className="text-sm font-semibold text-gray-900">Instant Download</p>
                <p className="text-xs text-gray-500">Immediate access</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3">
              <Shield className="h-7 w-7 text-emerald-700 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Secure Payment</p>
                <p className="text-xs text-gray-500">Powered by Stripe</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3">
              <FileText className="h-7 w-7 text-emerald-700 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Quality PDFs</p>
                <p className="text-xs text-gray-500">Professional docs</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3">
              <Globe className="h-7 w-7 text-emerald-700 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Worldwide</p>
                <p className="text-xs text-gray-500">190+ countries</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Browse by Category</h2>
            <p className="text-gray-500 mt-1">Find the documentation you need</p>
          </div>
          <Link href="/categories" className="text-sm text-emerald-700 hover:text-emerald-800 font-medium">
            View all &rarr;
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
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Featured Manuals</h2>
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
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Recently Added</h2>
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
            Your Source for Professional Technical Documentation
          </h2>
          <div className="prose prose-sm text-gray-600 max-w-none columns-1 md:columns-2 gap-8">
            <p>
              Service Manuals Pro is the world&apos;s leading marketplace for professional technical documentation.
              We provide high-quality service manuals, repair guides, schematics, and wiring diagrams
              for a wide range of equipment and devices.
            </p>
            <p>
              Whether you&apos;re a professional technician, a repair shop owner, or an enthusiast who loves
              restoring vintage equipment, our comprehensive library of technical documentation will help you
              get the job done right. From vintage camera repair manuals to modern automotive workshop guides,
              we have the documentation you need.
            </p>
            <p>
              All documents are available for instant download in PDF format after secure payment via Stripe.
              No subscription required — pay once and download immediately.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
