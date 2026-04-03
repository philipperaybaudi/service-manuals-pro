import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.service-manuals-pro.com'),
  title: {
    default: 'Service Manuals Pro | Professional Technical Documentation Downloads',
    template: '%s | Service Manuals Pro',
  },
  description:
    'The world\'s largest collection of professional service manuals, repair guides, schematics and wiring diagrams. Instant PDF download for cameras, audio, automotive, electronics and more.',
  keywords: [
    'service manual', 'repair manual', 'technical documentation', 'schematic',
    'wiring diagram', 'workshop manual', 'repair guide', 'PDF download',
    'camera repair', 'electronics repair', 'automotive repair',
  ],
  verification: {
    google: '6tka6O5Gywb6RdJeD4_dRxEkdpAWtaRPhJmNs9Rs4LI',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.service-manuals-pro.com',
    siteName: 'Service Manuals Pro',
    title: 'Service Manuals Pro | Professional Technical Documentation',
    description: 'Download professional service manuals, repair guides and schematics. Instant PDF delivery.',
    images: [{
      url: '/og-image.png',
      width: 1200,
      height: 630,
      alt: 'Service Manuals Pro - Professional Technical Documentation',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Service Manuals Pro',
    description: 'Professional technical documentation for instant download.',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.service-manuals-pro.com';

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Service Manuals Pro',
      url: siteUrl,
      description: 'Professional technical documentation marketplace',
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
      name: 'Service Manuals Pro',
      url: siteUrl,
      description: 'The world\'s largest collection of professional service manuals and technical documentation.',
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        url: `${siteUrl}/contact`,
      },
      sameAs: [],
    },
  ];

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased`}>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
