import { Metadata } from 'next';
import Link from '@/components/ExternalLink';
import { Search, Mail, BookOpen, Archive, Globe } from 'lucide-react';
import { getLocale, t } from '@/lib/locale';
import { SITE_URLS, tr } from '@/lib/i18n';
import { headers } from 'next/headers';

export const runtime = 'edge';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (headers().get('x-locale') === 'fr' ? 'fr' : 'en') as 'en' | 'fr';
  const title = tr(locale, 'about.meta_title');
  const description = tr(locale, 'about.meta_description');
  const base = SITE_URLS[locale];
  return {
    title,
    description,
    openGraph: { title, description, url: `${base}/about` },
    alternates: { canonical: `${base}/about` },
  };
}

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('about.title')}</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-6">
        {/* Right to Repair */}
        <div className="flex items-start gap-3">
          <BookOpen className="h-6 w-6 text-emerald-700 mt-1 shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t('about.right_to_repair_heading_prefix')}{' '}
              <Link
                href="https://en.wikipedia.org/wiki/Right_to_repair"
                className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
              >
                {t('about.right_to_repair_link')}
              </Link>
              *
            </h2>
          </div>
        </div>

        <p className="text-gray-700 leading-relaxed">
          {t('about.intro')}
        </p>

        <div className="flex items-start gap-3">
          <Search className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
          <p className="text-gray-700 leading-relaxed">
            {t('about.search_text')}
          </p>
        </div>

        <div className="flex items-start gap-3">
          <Archive className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
          <p className="text-gray-700 leading-relaxed">
            {t('about.archive_text')}
          </p>
        </div>

        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
          <p className="text-gray-700 leading-relaxed">
            {t('about.search_hint_prefix')}{' '}
            <span className="font-semibold text-emerald-800">&ldquo;{t('about.search_hint_field')}&rdquo;</span>{' '}
            {t('about.search_hint_suffix')}
          </p>
        </div>

        <div className="flex items-start gap-3">
          <Globe className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
          <p className="text-gray-700 leading-relaxed">
            {t('about.deep_web_text')}
          </p>
        </div>

        <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-4 border border-gray-100">
          <Mail className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
          <p className="text-gray-700 leading-relaxed">
            {t('about.contact_prefix')}{' '}
            <Link href="/contact" className="text-emerald-700 hover:text-emerald-800 font-semibold underline underline-offset-2">
              {t('about.contact_link')}
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
