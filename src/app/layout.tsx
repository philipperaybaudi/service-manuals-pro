import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LanguageBanner from '@/components/LanguageBanner';
import { getLocale } from '@/lib/locale';
import { messages, SITE_NAMES, SITE_URLS } from '@/lib/i18n';

const inter = Inter({ subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
  const locale = getLocale();
  const m = messages[locale];
  const siteName = SITE_NAMES[locale];
  const siteUrl = SITE_URLS[locale];

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: m['meta.default_title'],
      template: `%s | ${siteName}`,
    },
    description: m['meta.default_description'],
    keywords:
      locale === 'fr'
        ? [
            'manuel de service', 'manuel de réparation', 'documentation technique', 'schéma',
            'plan de câblage', "manuel d'atelier", 'guide de réparation', 'téléchargement PDF',
            'réparation appareil photo', 'réparation électronique', 'réparation automobile',
          ]
        : [
            'service manual', 'repair manual', 'technical documentation', 'schematic',
            'wiring diagram', 'workshop manual', 'repair guide', 'PDF download',
            'camera repair', 'electronics repair', 'automotive repair',
          ],
    verification: {
      google: '6tka6O5Gywb6RdJeD4_dRxEkdpAWtaRPhJmNs9Rs4LI',
    },
    openGraph: {
      type: 'website',
      locale: locale === 'fr' ? 'fr_FR' : 'en_US',
      url: siteUrl,
      siteName,
      title: m['meta.og_title'],
      description: m['meta.og_description'],
      images: [{
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: siteName,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: siteName,
      description: m['meta.twitter_description'],
      images: ['/og-image.png'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {},
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = getLocale();
  const siteName = SITE_NAMES[locale];
  const siteUrl = SITE_URLS[locale];
  const m = messages[locale];

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteName,
      url: siteUrl,
      description: m['meta.og_description'],
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${siteUrl}/?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: siteName,
      url: siteUrl,
      description: m['meta.default_description'],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        url: `${siteUrl}/contact`,
      },
      sameAs: [],
    },
  ];

  const bodyClass = `${inter.className} bg-gray-50 text-gray-900 antialiased${
    locale === 'fr' ? ' theme-fr' : ''
  }`;

  return (
    <html lang={locale}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={bodyClass}>
        <LanguageBanner currentLocale={locale} />
        <Header locale={locale} />
        <main className="min-h-screen">{children}</main>
        <Footer locale={locale} />
      </body>
    </html>
  );
}
