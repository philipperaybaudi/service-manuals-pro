import { headers } from 'next/headers';
import { messages, type Locale, type MessageKey } from './i18n';

/**
 * Lit le locale injecté par le middleware (via le header x-locale).
 * À utiliser uniquement dans les Server Components.
 */
export function getLocale(): Locale {
  const h = headers();
  // 1. Header x-locale injecté par le middleware
  const xLocale = h.get('x-locale');
  if (xLocale === 'fr' || xLocale === 'en') return xLocale as Locale;
  // 2. Host header (toujours présent dans une vraie requête HTTP)
  const host = h.get('host') ?? h.get('x-forwarded-host') ?? '';
  if (host.includes('manuels-pro.fr')) return 'fr';
  // 3. Fallback env var (build-time, ISR sans requête)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  return siteUrl.includes('.fr') ? 'fr' : 'en';
}

/**
 * Traduit une clé selon le locale courant (Server Component).
 */
export function t(key: MessageKey): string {
  const locale = getLocale();
  return messages[locale][key] ?? messages.en[key] ?? key;
}

/**
 * Traduit une clé pour un locale donné explicitement.
 * Utile pour les Client Components où on passe le locale en prop.
 */
export function tr(locale: Locale, key: MessageKey): string {
  return messages[locale][key] ?? messages.en[key] ?? key;
}
