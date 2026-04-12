import Link from '@/components/ExternalLink';
import { Monitor, Smartphone, Languages } from 'lucide-react';
import { t } from '@/lib/locale';

export default function DownloadNotice() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
      <div className="flex items-start gap-3">
        <Monitor className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-900 leading-relaxed">
          <span className="font-semibold">{t('notice.computer_required')}</span> {t('notice.computer_details')}
        </p>
      </div>
      <div className="flex items-start gap-3">
        <Smartphone className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800 leading-relaxed">
          {t('notice.no_mobile')}
        </p>
      </div>
      <div className="flex items-start gap-3">
        <Languages className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
        <p className="text-sm text-gray-700 leading-relaxed">
          {t('notice.translate')}{' '}
          <Link
            href="https://translate.google.com/intl/gb/about/"
            className="text-emerald-700 hover:text-emerald-800 font-semibold underline underline-offset-2"
          >
            {t('notice.google_translate')}
          </Link>
        </p>
      </div>
    </div>
  );
}
