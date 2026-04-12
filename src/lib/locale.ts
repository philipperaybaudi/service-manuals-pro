import { headers } from 'next/headers';
import { messages, type Locale, type MessageKey } from './i18n';

/**
 * Lit le locale injecté par le middleware (via le header x-locale).
 * À utiliser uniquement dans les Server Components.
 */
export function getLocale(): Locale {
  const h = headers();
  const value = h.get('x-locale');
  return value === 'fr' ? 'fr' : 'en';
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
