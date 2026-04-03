import Link from '@/components/ExternalLink';
import { Package } from 'lucide-react';

interface BrandCardProps {
  name: string;
  slug: string;
  categorySlug: string;
  logoUrl: string | null;
  documentCount: number;
}

/**
 * Generate a consistent gradient based on brand name.
 */
function getBrandGradient(name: string): string {
  const gradients = [
    'from-emerald-500 to-teal-600',
    'from-blue-500 to-indigo-600',
    'from-violet-500 to-purple-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-cyan-500 to-sky-600',
    'from-lime-500 to-green-600',
    'from-fuchsia-500 to-pink-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

export default function BrandCard({ name, slug, categorySlug, logoUrl, documentCount }: BrandCardProps) {
  const gradient = getBrandGradient(name);

  return (
    <Link
      href={`/categories/${categorySlug}/${slug}`}
      className="group bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-emerald-200 transition-all duration-200 flex flex-col items-center text-center"
    >
      <div className="w-20 h-20 rounded-lg flex items-center justify-center mb-3 overflow-hidden">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`${name} logo`}
            className="max-w-full max-h-full object-contain p-2"
          />
        ) : (
          <div className={`relative w-full h-full bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center shadow-sm overflow-hidden`}>
            <span className="text-2xl font-bold text-white drop-shadow-sm z-10">
              {name.charAt(0).toUpperCase()}
            </span>
            <Package className="absolute bottom-1 right-1 opacity-15 text-white h-8 w-8" />
          </div>
        )}
      </div>
      <h3 className="text-sm font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
        {name}
      </h3>
      <span className="text-xs text-gray-400 mt-1">
        {documentCount} manual{documentCount !== 1 ? 's' : ''}
      </span>
    </Link>
  );
}
