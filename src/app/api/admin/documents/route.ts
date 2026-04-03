import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

function checkAdmin(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret');
  return secret === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceClient();
  const { data } = await supabase
    .from('documents')
    .select('*, category:categories(name), brand:brands(name)')
    .order('created_at', { ascending: false });

  return NextResponse.json({ documents: data || [] });
}

export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing document id' }, { status: 400 });
  }

  // Only allow updating specific fields
  const allowedFields = [
    'title', 'slug', 'description', 'price', 'active', 'featured',
    'seo_title', 'seo_description', 'page_count', 'language',
  ];
  const safeUpdates: Record<string, any> = {};
  for (const key of allowedFields) {
    if (key in updates) {
      safeUpdates[key] = updates[key];
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('documents')
    .update(safeUpdates)
    .eq('id', id)
    .select('*, category:categories(name), brand:brands(name)')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ document: data });
}
