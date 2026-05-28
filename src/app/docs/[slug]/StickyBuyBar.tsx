'use client';

import { formatPrice } from '@/lib/utils';
import BuyButton from './BuyButton';

interface Props {
  documentId: string;
  documentTitle: string;
  price: number;
  locale: 'en' | 'fr';
}

export default function StickyBuyBar({ documentId, documentTitle, price, locale }: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.10)] px-4 py-3 flex items-center gap-4">
      <span className="text-xl font-bold text-gray-900 shrink-0">
        {formatPrice(price, 'USD', locale)}
      </span>
      <div className="flex-1">
        <BuyButton
          documentId={documentId}
          documentTitle={documentTitle}
          price={price}
          locale={locale}
        />
      </div>
    </div>
  );
}
