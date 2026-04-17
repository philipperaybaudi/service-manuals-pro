'use client';

import { useEffect, useState } from 'react';
import { X, Globe } from 'lucide-react';

interface LanguageBannerProps {
  currentLocale: 'en' | 'fr';
}

const OTHER_SITE = {
  en: { url: 'https://service-manuels-pro.fr', name: 'Service Manuels Pro', lang: 'fr', cta: 'Ce site est disponible en français', btn: 'Visiter le site français' },
  fr: { url: 'https://service-manuals-pro.com', name: 'Service Manuals Pro', lang: 'en', cta: 'This site is available in English', btn: 'Visit the English site' },
};

export default function LanguageBanner({ currentLocale }: LanguageBannerProps) {
  const [visible, setVisible] = useState(false);
  const other = OTHER_SITE[currentLocale];

  useEffect(() => {
    // Déjà fermé par l'utilisateur ?
    if (localStorage.getItem('lang-banner-dismissed') === 'true') return;

    const browserLang = navigator.language?.toLowerCase() || '';
    const browserIsFr = browserLang.startsWith('fr');

    // Afficher si la langue du navigateur ne correspond pas au site actuel
    if (currentLocale === 'en' && browserIsFr) setVisible(true);
    if (currentLocale === 'fr' && !browserIsFr) setVisible(true);
  }, [currentLocale]);

  const dismiss = () => {
    localStorage.setItem('lang-banner-dismissed', 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="w-full bg-blue-600 text-white text-sm z-50">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Globe size={16} className="shrink-0" />
          <span className="truncate">{other.cta}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <a
            href={other.url}
            className="bg-white text-blue-700 font-semibold px-3 py-1 rounded-full text-xs hover:bg-blue-50 transition-colors whitespace-nowrap"
          >
            {other.btn}
          </a>
          <button
            onClick={dismiss}
            aria-label="Fermer"
            className="text-white/70 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
