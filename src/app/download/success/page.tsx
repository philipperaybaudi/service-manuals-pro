import { Metadata } from 'next';
import { CheckCircle, Mail, Clock, HelpCircle } from 'lucide-react';
import Link from '@/components/ExternalLink';
import { t } from '@/lib/locale';
import { tr } from '@/lib/i18n';
import { headers } from 'next/headers';

export const runtime = 'edge';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (headers().get('x-locale') === 'fr' ? 'fr' : 'en') as 'en' | 'fr';
  return {
    title: tr(locale, 'download.meta_success'),
    robots: { index: false, follow: false },
  };
}

export default function DownloadSuccessPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('download.success_heading')}</h1>
      <p className="text-gray-500 mb-8">
        {t('download.success_subtitle')}
      </p>

      <div className="bg-white rounded-xl border border-gray-200 p-6 text-left space-y-4 mb-8">
        <div className="flex items-start gap-3">
          <Mail className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-gray-900">{t('download.check_email_title')}</p>
            <p className="text-sm text-gray-500">
              {t('download.check_email_text')}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-gray-900">{t('download.link_24h_title')}</p>
            <p className="text-sm text-gray-500">
              {t('download.link_24h_text')}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-gray-900">{t('download.need_help_title')}</p>
            <p className="text-sm text-gray-500">
              {t('download.need_help_text')}
            </p>
          </div>
        </div>
      </div>

      <Link
        href="/"
        className="text-emerald-700 hover:text-emerald-800 font-medium text-sm"
      >
        {t('download.back_homepage')}
      </Link>
    </div>
  );
}
