import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || 'notice pentax k1000';

  const { data: rows, error: rpcError } = await supabase
    .rpc('search_documents_by_title', { query_text: q });

  return NextResponse.json({
    query: q,
    rpc_rows: rows,
    rpc_error: rpcError,
    rpc_count: rows?.length ?? null,
  });
}
