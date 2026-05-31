/**
 * GET /sitemap/:page  (via rewrite beforeFiles dans next.config.mjs)
 * page=0 : pages statiques + catégories + marques
 * page=N : documents paginés (LIMIT 2000 OFFSET (N-1)*2000)
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { SITE_URLS } from '@/lib/i18n';

export const runtime = 'edge';

const PAGE_SIZE = 1000;

type UrlEntry = {
  loc:        string;
  lastmod:    string;
  changefreq: string;
  priority:   number;
};

export async function GET(
  request:  NextRequest,
  { params }: { params: { page: string } },
) {
  const page = parseInt(params.page, 10);
  if (isNaN(page) || page < 0) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const host    = request.headers.get('host') ?? '';
  const xLocale = request.headers.get('x-locale');
  const locale  = (xLocale === 'fr' || host.includes('service-manuels-pro.fr') ? 'fr' : 'en') as 'en' | 'fr';
  const baseUrl = SITE_URLS[locale];
  const today   = new Date().toISOString().split('T')[0];

  const urls: UrlEntry[] = [];

  if (page === 0) {
    // ── Pages statiques ─────────────────────────────────────────────────────
    urls.push(
      { loc: baseUrl,                  lastmod: today, changefreq: 'daily',   priority: 1 },
      { loc: `${baseUrl}/categories`,  lastmod: today, changefreq: 'weekly',  priority: 0.9 },
      { loc: `${baseUrl}/about`,       lastmod: today, changefreq: 'monthly', priority: 0.3 },
      { loc: `${baseUrl}/contact`,     lastmod: today, changefreq: 'monthly', priority: 0.3 },
      { loc: `${baseUrl}/terms`,       lastmod: today, changefreq: 'monthly', priority: 0.2 },
      { loc: `${baseUrl}/privacy`,     lastmod: today, changefreq: 'monthly', priority: 0.2 },
    );

    // ── Catégories ──────────────────────────────────────────────────────────
    const { data: cats } = await supabase
      .from('categories')
      .select('slug, created_at')
      .limit(500);
    for (const cat of cats ?? []) {
      urls.push({
        loc:        `${baseUrl}/categories/${cat.slug}`,
        lastmod:    cat.created_at?.split('T')[0] ?? today,
        changefreq: 'weekly',
        priority:   0.8,
      });
    }

    // ── Marques (paginé, peut dépasser 1000) ────────────────────────────────
    let from = 0;
    while (true) {
      const { data } = await supabase
        .from('brands')
        .select('slug, created_at, category:categories(slug)')
        .range(from, from + 999);
      if (!data || data.length === 0) break;
      for (const brand of data) {
        const catSlug = (brand.category as any)?.slug;
        if (catSlug) {
          urls.push({
            loc:        `${baseUrl}/categories/${catSlug}/${brand.slug}`,
            lastmod:    brand.created_at?.split('T')[0] ?? today,
            changefreq: 'weekly',
            priority:   0.7,
          });
        }
      }
      if (data.length < 1000) break;
      from += 1000;
    }
  } else {
    // ── Documents paginés ────────────────────────────────────────────────────
    const offset = (page - 1) * PAGE_SIZE;
    const { data: docs } = await supabase
      .from('documents')
      .select('slug, updated_at')
      .eq('active', true)
      .range(offset, offset + PAGE_SIZE - 1);

    for (const doc of docs ?? []) {
      urls.push({
        loc:        `${baseUrl}/docs/${doc.slug}`,
        lastmod:    doc.updated_at?.split('T')[0] ?? today,
        changefreq: 'monthly',
        priority:   0.6,
      });
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type':  'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
}
