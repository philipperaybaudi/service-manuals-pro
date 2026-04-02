import { getServiceClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';

export const runtime = 'edge';
import { Download, Clock, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import Link from '@/components/ExternalLink';

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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Download Link</h1>
        <p className="text-gray-500 mb-8">
          This download link is not valid. Please check your email for the correct link.
        </p>
        <Link href="/" className="text-emerald-700 hover:text-emerald-800 font-medium text-sm">
          &larr; Back to homepage
        </Link>
      </div>
    );
  }

  // Check expiration
  if (new Date(order.download_expires_at) < new Date()) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <Clock className="h-16 w-16 text-orange-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Download Link Expired</h1>
        <p className="text-gray-500 mb-8">
          This download link has expired. Please contact support for assistance.
        </p>
        <Link href="/" className="text-emerald-700 hover:text-emerald-800 font-medium text-sm">
          &larr; Back to homepage
        </Link>
      </div>
    );
  }

  // Check max downloads
  if (order.download_count >= 3) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <AlertTriangle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Download Limit Reached</h1>
        <p className="text-gray-500 mb-8">
          You have reached the maximum number of downloads (3). Please contact support if you need further access.
        </p>
        <Link href="/" className="text-emerald-700 hover:text-emerald-800 font-medium text-sm">
          &larr; Back to homepage
        </Link>
      </div>
    );
  }

  const doc = order.document;
  const bundleFiles = getBundleFiles(doc?.seo_tags);

  if (bundleFiles.length > 1) {
    // === BUNDLE DOWNLOAD PAGE ===
    // Generate signed URLs for all files
    const fileLinks: { name: string; url: string; size?: string }[] = [];

    for (const filePath of bundleFiles) {
      const { data: signedUrl } = await supabaseAdmin.storage
        .from('documents')
        .createSignedUrl(filePath, 300); // 5 min

      if (signedUrl) {
        const fileName = filePath.split('/').pop()?.replace(/\.pdf$/i, '') || 'File';
        const displayName = fileName.replace(/_/g, ' ');
        fileLinks.push({ name: displayName, url: signedUrl.signedUrl });
      }
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Files are Ready</h1>
          <p className="text-gray-500">
            {doc?.title}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <p className="text-sm text-gray-500 mb-4">
            This bundle contains {fileLinks.length} files. Click each button to download.
            Each link is valid for 5 minutes.
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
              ? `You can access this page ${remainingDownloads} more time${remainingDownloads > 1 ? 's' : ''}.`
              : 'This was your last access to this download page.'}
          </p>
          <Link href="/" className="text-emerald-700 hover:text-emerald-800 font-medium mt-4 inline-block">
            &larr; Back to homepage
          </Link>
        </div>
      </div>
    );
  } else {
    // === SINGLE FILE: redirect to API download endpoint ===
    // Update download count
    await supabaseAdmin
      .from('orders')
      .update({
        download_count: order.download_count + 1,
        downloaded_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (!doc?.file_path) {
      return (
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">File Not Found</h1>
          <p className="text-gray-500 mb-8">The document file could not be found. Please contact support.</p>
        </div>
      );
    }

    // Generate signed URL and redirect
    const { data: signedUrl } = await supabaseAdmin.storage
      .from('documents')
      .createSignedUrl(doc.file_path, 300);

    if (!signedUrl) {
      return (
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Download Error</h1>
          <p className="text-gray-500 mb-8">Failed to generate download link. Please try again or contact support.</p>
        </div>
      );
    }

    redirect(signedUrl.signedUrl);
  }
}
