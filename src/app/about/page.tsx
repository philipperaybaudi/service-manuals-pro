import { Metadata } from 'next';
import Link from '@/components/ExternalLink';
import { Search, Mail, BookOpen, Archive, Globe } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us | Service Manuals Pro',
  description: 'Service Manuals Pro supports the Right to Repair. Find user manuals, service manuals, schematics and technical documentation for any brand.',
  openGraph: {
    title: 'About Us | Service Manuals Pro',
    description: 'Supporting the Right to Repair. Find the documentation you need.',
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.service-manuals-pro.com'}/about`,
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.service-manuals-pro.com'}/about`,
  },
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">About Us</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-6">
        {/* Right to Repair */}
        <div className="flex items-start gap-3">
          <BookOpen className="h-6 w-6 text-emerald-700 mt-1 shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              The{' '}
              <Link
                href="https://en.wikipedia.org/wiki/Right_to_repair"
                className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
              >
                Right to Repair
              </Link>
              *
            </h2>
          </div>
        </div>

        <p className="text-gray-700 leading-relaxed">
          Find the documentation you need on this site!
        </p>

        <div className="flex items-start gap-3">
          <Search className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
          <p className="text-gray-700 leading-relaxed">
            Find a user manual, an instruction booklet, a service manual, or any technical documentation regardless of the brand.
          </p>
        </div>

        <div className="flex items-start gap-3">
          <Archive className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
          <p className="text-gray-700 leading-relaxed">
            You can archive your user manuals and instruction booklets (or your workshop service manuals) to consult them later and ensure the maintenance or repair of your equipment.
          </p>
        </div>

        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
          <p className="text-gray-700 leading-relaxed">
            Enter your search in the <span className="font-semibold text-emerald-800">&ldquo;Search manuals...&rdquo;</span> field at the top of the page.
          </p>
        </div>

        <div className="flex items-start gap-3">
          <Globe className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
          <p className="text-gray-700 leading-relaxed">
            If you cannot find the documentation you are looking for on this site, we can search for you across the vastness of the Internet and even the Deep Web, at no additional research cost.
          </p>
        </div>

        <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-4 border border-gray-100">
          <Mail className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
          <p className="text-gray-700 leading-relaxed">
            Don&apos;t hesitate to{' '}
            <Link href="/contact" className="text-emerald-700 hover:text-emerald-800 font-semibold underline underline-offset-2">
              contact us
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
