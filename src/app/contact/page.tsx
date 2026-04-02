import { Metadata } from 'next';
import Link from '@/components/ExternalLink';
import { Mail, Clock, Globe, MessageSquare, MapPin, Building } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact Us | Service Manuals Pro',
  description: 'Contact Service Manuals Pro for any question about our technical documentation, custom research requests, or support.',
  openGraph: {
    title: 'Contact Us | Service Manuals Pro',
    description: 'Get in touch with our team for support or custom documentation requests.',
  },
};

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Contact Us</h1>
      <p className="text-gray-500 mb-8">We&apos;re here to help. Don&apos;t hesitate to reach out.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Email card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <Mail className="h-5 w-5 text-emerald-700" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Email</h2>
          </div>
          <p className="text-gray-600 text-sm mb-3">
            Send us an email and we&apos;ll get back to you as soon as possible.
          </p>
          <Link
            href="mailto:contact@service-manuals-pro.com"
            className="text-emerald-700 hover:text-emerald-800 font-semibold text-sm underline underline-offset-2"
          >
            contact@service-manuals-pro.com
          </Link>
        </div>

        {/* Response time card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <Clock className="h-5 w-5 text-emerald-700" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Response Time</h2>
          </div>
          <p className="text-gray-600 text-sm">
            We typically respond within <span className="font-semibold text-gray-900">72 hours</span> during business days.
          </p>
        </div>
      </div>

      {/* Company details */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Company Details</h2>

        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
              <Building className="h-4 w-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">SHOP OF TECHNICAL DOCUMENTATIONS</h3>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="h-4 w-4 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm text-gray-700 leading-relaxed">
                Business Hub Lu&#x10D;eneck&#xe1; cesta 2266/6<br />
                96096 ZVOLEN<br />
                Slovakia
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
              <Globe className="h-4 w-4 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm text-gray-700">
                Zvolen Trade Register No.: <span className="font-semibold">36807516</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-600">
            For any inquiry, please contact us at{' '}
            <Link
              href="mailto:contact@service-manuals-pro.com"
              className="text-emerald-700 hover:text-emerald-800 font-semibold underline underline-offset-2"
            >
              contact@service-manuals-pro.com
            </Link>
          </p>
        </div>
      </div>

      {/* What we can help with */}
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">How can we help?</h2>

        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
              <Globe className="h-4 w-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Custom Documentation Research</h3>
              <p className="text-sm text-gray-600 mt-1">
                Can&apos;t find the manual you need? We can search across the Internet and even the Deep Web for you, at no additional research cost.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
              <MessageSquare className="h-4 w-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Order Support</h3>
              <p className="text-sm text-gray-600 mt-1">
                Questions about a purchase, download link, or payment? We&apos;re here to help.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
              <Mail className="h-4 w-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">General Inquiries</h3>
              <p className="text-sm text-gray-600 mt-1">
                Any other question or suggestion? We&apos;d love to hear from you.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <Link
            href="mailto:contact@service-manuals-pro.com"
            className="inline-flex items-center gap-2 bg-emerald-700 text-white px-8 py-3 rounded-full font-semibold hover:bg-emerald-800 transition-colors shadow-lg"
          >
            <Mail className="h-5 w-5" />
            Send us an email
          </Link>
        </div>
      </div>
    </div>
  );
}
