import Link from '@/components/ExternalLink';
import { FileText, Download } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import type { Document } from '@/lib/types';
import { t, getLocale } from '@/lib/locale';

interface DocCardProps {
  doc: Document;
  showCategory?: boolean;
}

export default function DocCard({ doc, showCategory }: DocCardProps) {
  const locale = getLocale();
  return (
    <Link
      href={`/docs/${doc.slug}`}
      className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all duration-200"
    >
      {/* Preview */}
      <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center relative overflow-hidden">
        {doc.preview_url ? (
          <img
            src={doc.preview_url}
            alt={doc.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-300">
            <FileText className="h-12 w-12" />
            <span className="text-xs font-medium">{t('doc.pdf_document')}</span>
          </div>
        )}
        {doc.featured && (
          <span className="absolute top-2 left-2 bg-amber-500 text-white text-xs font-semibold px-2 py-1 rounded">
            {t('doc.featured_badge')}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        {showCategory && doc.brand && (
          <span className="text-xs text-emerald-700 font-medium uppercase tracking-wide">
            {doc.brand.name}
          </span>
        )}
        <h3 className="text-sm font-semibold text-gray-900 mt-1 line-clamp-2 group-hover:text-emerald-700 transition-colors">
          {doc.title}
        </h3>
        {(doc.description || doc.description_fr) && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {((locale === 'fr' && doc.description_fr) ? doc.description_fr : doc.description).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}
          </p>
        )}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <span className="text-lg font-bold text-gray-900">{formatPrice(doc.price, 'USD', locale)}</span>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Download className="h-3 w-3" />
            PDF
            {doc.page_count && ` · ${doc.page_count}p`}
          </span>
        </div>
      </div>
    </Link>
  );
}
