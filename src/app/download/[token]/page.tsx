import { Metadata } from 'next';
import { getServiceClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import { t } from '@/lib/locale';
import { tr } from '@/lib/i18n';
import { headers } from 'next/headers';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (headers().get('x-locale') === 'fr' ? 'fr' : 'en') as 'en' | 'fr';
  return {
    title: tr(locale, 'download.meta_token'),
    robots: { index: false, follow: false },
  };
}
import { Download, Clock, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import Link from '@/components/ExternalLink';

export const runtime = 'edge';

/**
 * Extract bundle file paths from seo_tags (entries prefixed with "file:").
 */
function getBundleFiles(seoTags: string[] | null): string[] {
  if (!seoTags || !Array.isArray(seoTags)) return [];
  return seoTags
    .filter(tag => tag.startsWith('file:'))
    .map(tag => tag.replace('file:', ''));
}

export default async function DownloadPage({
  params,
}: {
  params: { token: string };
}) {
  const supabaseAdmin = getServiceClient();

  // Find the order
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*, document:documents(*)')
    .eq('download_token', params.token)
    .single();

  if (error || !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('download.invalid_title')}</h1>
        <p className="text-gray-500 mb-8">
          {t('download.invalid_text')}
        </p>
        <Link href="/" className="text-emerald-700 hover:text-emerald-800 font-medium text-sm">
          {t('download.back_homepage')}
        </Link>
      </div>
    );
  }

  // Check expiration
  if (new Date(order.download_expires_at) < new Date()) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <Clock className="h-16 w-16 text-orange-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('download.expired_title')}</h1>
        <p className="text-gray-500 mb-8">
          {t('download.expired_text')}
        </p>
        <Link href="/" className="text-emerald-700 hover:text-emerald-800 font-medium text-sm">
          {t('download.back_homepage')}
        </Link>
      </div>
    );
  }

  // Check max downloads
  if (order.download_count >= 3) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <AlertTriangle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('download.limit_title')}</h1>
        <p className="text-gray-500 mb-8">
          {t('download.limit_text')}
        </p>
        <Link href="/" className="text-emerald-700 hover:text-emerald-800 font-medium text-sm">
          {t('download.back_homepage')}
        </Link>
      </div>
    );
  }

  const doc = order.document;
  const bundleFiles = getBundleFiles(doc?.seo_tags);

  if (bundleFiles.length > 1) {
    // === BUNDLE DOWNLOAD PAGE ===
    // For bundles, each file gets its own API download link via the token
    // We use query param ?file=index to specify which file in the bundle
    const fileLinks: { name: string; url: string }[] = [];

    for (let i = 0; i < bundleFiles.length; i++) {
      const filePath = bundleFiles[i];
      const fileName = filePath.split('/').pop()?.replace(/\.pdf$/i, '') || 'File';
      const displayName = fileName.replace(/_/g, ' ');
      // Point to the API download route with a file index param
      fileLinks.push({
        name: displayName,
        url: `/api/download/${params.token}?file=${i}`,
      });
    }

    // Update download count
    await supabaseAdmin
      .from('orders')
      .update({
        download_count: order.download_count + 1,
        downloaded_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    const remainingDownloads = 2 - order.download_count;

    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('download.files_ready')}</h1>
          <p className="text-gray-500">
            {doc?.title}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <p className="text-sm text-gray-500 mb-4">
            {t('download.bundle_contains_prefix')} {fileLinks.length} {t('download.bundle_contains_suffix')}
          </p>

          <div className="space-y-3">
            {fileLinks.map((file, i) => (
              <a
                key={i}
                href={file.url}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-emerald-50 transition-colors group"
                download
              >
                <FileText className="h-5 w-5 text-gray-400 group-hover:text-emerald-600 shrink-0" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-emerald-700 flex-1">
                  {file.name}
                </span>
                <Download className="h-4 w-4 text-gray-400 group-hover:text-emerald-600 shrink-0" />
              </a>
            ))}
          </div>
        </div>

        <div className="text-center text-sm text-gray-400">
          <p>
            {remainingDownloads > 0
              ? `${t('download.remaining_prefix')} ${remainingDownloads} ${remainingDownloads > 1 ? t('download.remaining_more_times') : t('download.remaining_more_time')}.`
              : t('download.last_access')}
          </p>
          <Link href="/" className="text-emerald-700 hover:text-emerald-800 font-medium mt-4 inline-block">
            {t('download.back_homepage')}
          </Link>
        </div>
      </div>
    );
  } else {
    // === SINGLE FILE: redirect to API download endpoint ===
    // The API route handles R2 download with fallback to Supabase
    redirect(`/api/download/${params.token}`);
  }
}
