import Link from '@/components/ExternalLink';
import { ChevronRight } from 'lucide-react';
import { t } from '@/lib/locale';

interface SidebarCategory {
  name: string;
  slug: string;
  documentCount: number;
}

interface CategorySidebarProps {
  categories: SidebarCategory[];
  currentSlug?: string;
}

export default function CategorySidebar({ categories, currentSlug }: CategorySidebarProps) {
  return (
    <nav className="bg-white rounded-xl border border-gray-200 p-4 sticky top-24">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 px-2">
        {t('header.all_categories')}
      </h3>
      <ul className="space-y-0.5">
        {categories.map((cat) => {
          const isActive = cat.slug === currentSlug;
          return (
            <li key={cat.slug}>
              <Link
                href={`/categories/${cat.slug}`}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span>{cat.name}</span>
                <div className="flex items-center gap-1">
                  <span className={`text-xs ${isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {cat.documentCount}
                  </span>
                  <ChevronRight className={`h-3 w-3 ${isActive ? 'text-emerald-600' : 'text-gray-300'}`} />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
