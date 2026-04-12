import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Détection du locale via le domaine :
//   service-manuels-pro.fr → fr
//   (tout le reste)         → en
export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const locale = host.includes('service-manuels-pro.fr') ? 'fr' : 'en';

  // On injecte le locale dans les headers pour que les Server Components
  // puissent le lire via `headers()` depuis `next/headers`.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-locale', locale);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  // On applique le middleware à toutes les pages (hors assets statiques)
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|og-image.png|robots.txt|sitemap.xml|.*\\..*).*)',
  ],
};
