import { Metadata } from 'next';
import Link from '@/components/ExternalLink';
import { Mail, Clock, Globe, MessageSquare, MapPin, Building } from 'lucide-react';
import { getLocale, t } from '@/lib/locale';
import { SITE_URLS, tr } from '@/lib/i18n';
import { headers } from 'next/headers';

export const runtime = 'edge';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (headers().get('x-locale') === 'fr' ? 'fr' : 'en') as 'en' | 'fr';
  const title = tr(locale, 'contact.meta_title');
  const description = tr(locale, 'contact.meta_description');
  const base = SITE_URLS[locale];
  return {
    title,
    description,
    openGraph: { title, description, url: `${base}/contact` },
    alternates: { canonical: `${base}/contact` },
  };
}

export default function ContactPage() {
  const locale = getLocale();
  const contactEmail = locale === 'fr'
    ? 'contact@service-manuels-pro.fr'
    : 'contact@service-manuals-pro.com';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('contact.title')}</h1>
      <p className="text-gray-500 mb-8">{t('contact.page_subtitle')}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Email card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <Mail className="h-5 w-5 text-emerald-700" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{t('contact.email_card_title')}</h2>
          </div>
          <p className="text-gray-600 text-sm mb-3">
            {t('contact.email_card_text')}
          </p>
          <Link
            href={`mailto:${contactEmail}`}
            className="text-emerald-700 hover:text-emerald-800 font-semibold text-sm underline underline-offset-2"
          >
            {contactEmail}
          </Link>
        </div>

        {/* Response time card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <Clock className="h-5 w-5 text-emerald-700" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{t('contact.response_card_title')}</h2>
          </div>
          <p className="text-gray-600 text-sm">
            {t('contact.response_card_text_prefix')}{' '}
            <span className="font-semibold text-gray-900">{t('contact.response_card_text_time')}</span>{' '}
            {t('contact.response_card_text_suffix')}
          </p>
        </div>
      </div>

      {/* Company details */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('contact.company_title')}</h2>

        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
              <Building className="h-4 w-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{t('contact.company_name_1')}</h3>
              <h3 className="font-semibold text-gray-900">{t('contact.company_name_2')}</h3>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="h-4 w-4 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm text-gray-700 leading-relaxed">
                Business Hub Lu&#x10D;eneck&#xe1; cesta 2266/6<br />
                96096 ZVOLEN<br />
                {locale === 'fr' ? 'Slovaquie' : 'Slovakia'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
              <Globe className="h-4 w-4 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm text-gray-700">
                {t('contact.company_register_label')} <span className="font-semibold">36807516</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-600">
            {t('contact.for_inquiry_prefix')}{' '}
            <Link
              href={`mailto:${contactEmail}`}
              className="text-emerald-700 hover:text-emerald-800 font-semibold underline underline-offset-2"
            >
              {contactEmail}
            </Link>
          </p>
        </div>
      </div>

      {/* What we can help with */}
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('contact.how_help_title')}</h2>

        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
              <Globe className="h-4 w-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{t('contact.help_research_title')}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {t('contact.help_research_text')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
              <MessageSquare className="h-4 w-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{t('contact.help_order_title')}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {t('contact.help_order_text')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
              <Mail className="h-4 w-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{t('contact.help_general_title')}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {t('contact.help_general_text')}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <Link
            href={`mailto:${contactEmail}`}
            className="inline-flex items-center gap-2 bg-emerald-700 text-white px-8 py-3 rounded-full font-semibold hover:bg-emerald-800 transition-colors shadow-lg"
          >
            <Mail className="h-5 w-5" />
            {t('contact.send_email_button')}
          </Link>
        </div>
      </div>
    </div>
  );
}
