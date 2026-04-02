import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'edge';

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
