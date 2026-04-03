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
    .from('orders')
    .select('*, document:documents(title)')
    .order('created_at', { ascending: false })
    .limit(100);

  return NextResponse.json({ orders: data || [] });
}
