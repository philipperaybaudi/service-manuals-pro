import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

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

  if (!order.document?.file_path) {
    return NextResponse.json(
      { error: 'Document file not found.' },
      { status: 404 }
    );
  }

  // Generate a signed URL (valid 5 min)
  const { data: signedUrl, error: urlError } = await supabaseAdmin.storage
    .from('documents')
    .createSignedUrl(order.document.file_path, 300);

  if (urlError || !signedUrl) {
    return NextResponse.json(
      { error: 'Failed to generate download link.' },
      { status: 500 }
    );
  }

  // Update download count and timestamp
  await supabaseAdmin
    .from('orders')
    .update({
      download_count: order.download_count + 1,
      downloaded_at: new Date().toISOString(),
    })
    .eq('id', order.id);

  // Redirect to signed URL
  return NextResponse.redirect(signedUrl.signedUrl);
}
