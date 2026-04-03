import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { getDocumentFromR2 } from '@/lib/r2';

/**
 * Extract bundle file paths from seo_tags (entries prefixed with "file:").
 */
function getBundleFiles(seoTags: string[] | null): string[] {
  if (!seoTags || !Array.isArray(seoTags)) return [];
  return seoTags
    .filter((tag: string) => tag.startsWith('file:'))
    .map((tag: string) => tag.replace('file:', ''));
}

/**
 * Try to serve a file from R2, with fallback to Supabase Storage.
 */
async function serveFile(
  filePath: string,
  fileName: string,
  supabaseAdmin: any
): Promise<Response> {
  // Try R2 first
  let response: Response | null = null;
  try {
    response = await getDocumentFromR2(filePath, fileName);
  } catch (r2Error) {
    console.error('R2 fetch failed, falling back to Supabase Storage:', r2Error);
  }

  if (response) {
    return response;
  }

  // Fallback: Supabase Storage (for files not yet migrated)
  const { data: signedUrl, error: urlError } = await supabaseAdmin.storage
    .from('documents')
    .createSignedUrl(filePath, 300);

  if (urlError || !signedUrl) {
    return NextResponse.json(
      { error: 'Failed to generate download link.' },
      { status: 500 }
    );
  }

  const fileRes = await fetch(signedUrl.signedUrl);
  if (!fileRes.ok) {
    return NextResponse.json(
      { error: 'Failed to download file.' },
      { status: 500 }
    );
  }

  return new Response(fileRes.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const supabaseAdmin = getServiceClient();

  // Find the order
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*, document:documents(*)')
    .eq('download_token', params.token)
    .single();

  if (error || !order) {
    return NextResponse.json(
      { error: 'Invalid download link.' },
      { status: 404 }
    );
  }

  // Check expiration
  if (new Date(order.download_expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'This download link has expired. Please contact support.' },
      { status: 410 }
    );
  }

  // Check max downloads (allow 3)
  if (order.download_count >= 3) {
    return NextResponse.json(
      { error: 'Maximum download attempts reached. Please contact support.' },
      { status: 429 }
    );
  }

  // Determine which file to serve
  const fileIndexParam = req.nextUrl.searchParams.get('file');
  let filePath: string;
  let fileName: string;

  if (fileIndexParam !== null) {
    // Bundle download: serve a specific file by index
    const bundleFiles = getBundleFiles(order.document?.seo_tags);
    const fileIndex = parseInt(fileIndexParam, 10);

    if (isNaN(fileIndex) || fileIndex < 0 || fileIndex >= bundleFiles.length) {
      return NextResponse.json(
        { error: 'Invalid file index.' },
        { status: 400 }
      );
    }

    filePath = bundleFiles[fileIndex];
    const rawName = filePath.split('/').pop()?.replace(/\.pdf$/i, '') || 'document';
    fileName = rawName.replace(/_/g, ' ').replace(/[^a-zA-Z0-9 _\-\.]/g, '').trim() + '.pdf';
  } else {
    // Single file download
    if (!order.document?.file_path) {
      return NextResponse.json(
        { error: 'Document file not found.' },
        { status: 404 }
      );
    }

    filePath = order.document.file_path;
    fileName = order.document.title
      ? order.document.title.replace(/[^a-zA-Z0-9 _\-\.]/g, '').trim() + '.pdf'
      : 'document.pdf';
  }

  const response = await serveFile(filePath, fileName, supabaseAdmin);

  // Update download count and timestamp (only for single file or first bundle access)
  if (fileIndexParam === null || fileIndexParam === '0') {
    await supabaseAdmin
      .from('orders')
      .update({
        download_count: order.download_count + 1,
        downloaded_at: new Date().toISOString(),
      })
      .eq('id', order.id);
  }

  return response;
}
