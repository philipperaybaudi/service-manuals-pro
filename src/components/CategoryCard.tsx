import Link from '@/components/ExternalLink';
import { ChevronRight } from 'lucide-react';
import { getLocale } from '@/lib/locale';

interface CategoryCardProps {
  name: string;
  slug: string;
  description: string;
  documentCount: number;
  brandCount: number;
}

export default function CategoryCard({ name, slug, description, documentCount, brandCount }: CategoryCardProps) {
  const locale = getLocale();
  const manuals = locale === 'fr'
    ? `${documentCount} manuel${documentCount !== 1 ? 's' : ''}`
    : `${documentCount} manual${documentCount !== 1 ? 's' : ''}`;
  const brands = locale === 'fr'
    ? `${brandCount} marque${brandCount !== 1 ? 's' : ''}`
    : `${brandCount} brand${brandCount !== 1 ? 's' : ''}`;

  return (
    <Link
      href={`/categories/${slug}`}
      className="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-emerald-200 transition-all duration-200"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
            {name}
          </h3>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{description}</p>
          <div className="flex items-center gap-4 mt-3">
            <span className="text-xs font-medium text-gray-400">{manuals}</span>
            {brandCount > 0 && (
              <span className="text-xs font-medium text-gray-400">{brands}</span>
            )}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-emerald-600 transition-colors shrink-0 mt-1" />
      </div>
    </Link>
  );
}
