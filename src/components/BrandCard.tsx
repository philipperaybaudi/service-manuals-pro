import Link from '@/components/ExternalLink';
import Image from 'next/image';

interface BrandCardProps {
  name: string;
  slug: string;
  categorySlug: string;
  logoUrl: string | null;
  documentCount: number;
}

export default function BrandCard({ name, slug, categorySlug, logoUrl, documentCount }: BrandCardProps) {
  return (
    <Link
      href={`/categories/${categorySlug}/${slug}`}
      className="group bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-emerald-200 transition-all duration-200 flex flex-col items-center text-center"
    >
      <div className="w-20 h-20 rounded-lg bg-gray-50 flex items-center justify-center mb-3 overflow-hidden">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`${name} logo`}
            className="max-w-full max-h-full object-contain p-2"
          />
        ) : (
          <span className="text-2xl font-bold text-gray-300">{name.charAt(0)}</span>
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
