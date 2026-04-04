import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';

import CategoryCard from '@/components/CategoryCard';

export const runtime = 'edge';

export const metadata: Metadata = {
  title: 'All Categories | Browse Technical Documentation',
  description: 'Browse all categories of professional service manuals and technical documentation. Find repair guides, schematics, and workshop manuals organized by equipment type.',
  openGraph: {
    title: 'All Categories | Browse Technical Documentation',
    description: 'Browse all categories of professional service manuals and technical documentation.',
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.service-manuals-pro.com'}/categories`,
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.service-manuals-pro.com'}/categories`,
  },
};

export const revalidate = 3600;

export default async function CategoriesPage() {
  const { data: categories } = await supabase
    .from('categories')
    .select('*, brands(count), documents(count)')
    .eq('documents.active', true)
    .order('display_order');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">All Categories</h1>
      <p className="text-gray-500 mb-8">Browse our complete collection of technical documentation</p>

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
