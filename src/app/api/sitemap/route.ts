/**
 * GET /sitemap.xml  (via rewrite beforeFiles dans next.config.mjs)
 * Retourne un <sitemapindex> dynamique :
 *   - /sitemap/0  → pages statiques + catégories + marques
 *   - /sitemap/1  → documents 1-2000
 *   - /sitemap/N  → documents suivants
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { SITE_URLS } from '@/lib/i18n';

export const runtime = 'edge';

const PAGE_SIZE = 1000;

export async function GET(request: NextRequest) {
  const host     = request.headers.get('host') ?? '';
  const xLocale  = request.headers.get('x-locale');
  const locale   = (xLocale === 'fr' || host.includes('service-manuels-pro.fr') ? 'fr' : 'en') as 'en' | 'fr';
  const baseUrl  = SITE_URLS[locale];
  const today    = new Date().toISOString().split('T')[0];

  // COUNT des documents actifs (requête légère, pas de fetch de données)
  const { count } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('active', true);

  const totalDocs = count ?? 0;
  const docPages  = Math.ceil(totalDocs / PAGE_SIZE);

  // id=0 : statiques + catégories + marques | id=1..N : documents paginés
  const ids = [0, ...Array.from({ length: docPages }, (_, i) => i + 1)];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ids.map(id => `  <sitemap>
    <loc>${baseUrl}/sitemap/${id}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type':  'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
}
