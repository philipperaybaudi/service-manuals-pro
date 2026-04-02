import { Metadata } from 'next';
import Link from '@/components/ExternalLink';
import { AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service | Service Manuals Pro',
  description: 'Terms of Service and General Conditions of Sale for Service Manuals Pro. Information about payments, downloads, refund policy and documentation services.',
  openGraph: {
    title: 'Terms of Service | Service Manuals Pro',
    description: 'General Conditions of Sale for Service Manuals Pro.',
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.service-manuals-pro.com'}/terms`,
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.service-manuals-pro.com'}/terms`,
  },
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-8">

        {/* Important notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h2 className="font-semibold text-amber-900 mb-2">Important Notice</h2>
              <p className="text-sm text-amber-800 leading-relaxed">
                Documentation downloads work correctly on a computer connected to the Internet with up-to-date applications. Smartphones and tablets should be avoided as they do not always have the appropriate PDF reader and/or sufficient memory capacity to handle documentation whose digitized content can be substantial.
              </p>
            </div>
          </div>
        </div>

        {/* Payments */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Payments</h2>
          <p className="text-gray-700 leading-relaxed">
            Like many businesses, we use the services of{' '}
            <Link href="https://stripe.com" className="text-emerald-700 hover:text-emerald-800 font-semibold underline underline-offset-2">
              STRIPE.COM
            </Link>{' '}
            to secure online card payments for our customers.
          </p>
        </section>

        {/* Right to Repair */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            The{' '}
            <Link href="https://en.wikipedia.org/wiki/Right_to_repair" className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
              Right to Repair
            </Link>
            *
          </h2>
          <h3 className="text-lg font-medium text-gray-800 mb-3">Find the documentation you need!</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            In an ideal world, every machine should be delivered with documentation written in the end customer&apos;s language. However, some manufacturers do not archive their technical documentation. Moreover, they rarely hesitate to respond that the requested document is out of print. They often prefer to sell new equipment.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Service Manuals Pro offers its assistance in these situations. It provides access to a multitude of digitized documents.
          </p>
        </section>

        {/* Independence */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Independence</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Service Manuals Pro is not affiliated with any manufacturer. Consequently, it does not provide after-sales service for any brand. Its sole role is to search for the information you need. Furthermore, the documentation is made available in a format that allows rapid delivery by electronic means. Digitized documents are generally in PDF format. It is this provision of a download link that you are paying for.
          </p>
        </section>

        {/* Download warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h2 className="font-semibold text-amber-900 mb-2">Important</h2>
              <p className="text-sm text-amber-800 leading-relaxed">
                Due to file sizes, documentation must be downloaded on a computer (PC, Mac, or Linux). Phones and tablets are generally unable to save large documentation files. If you do not follow these guidelines, Service Manuals Pro cannot be held responsible if the customer is unable to open, view, save, or print the ordered documentation.
              </p>
            </div>
          </div>
        </div>

        {/* Nature of services */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Nature of Services</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            First and foremost, Service Manuals Pro is a documentation provision and research service. These documents cover various types of equipment, tutorials, courses, and software: user manuals, instruction booklets, service manuals, electronic schematics, mechanical exploded views, parts lists, calibration procedures, assembly instructions, operating manuals, maintenance manuals, training tutorials, etc. This list is not exhaustive and may evolve based on user requests.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            The images illustrating the documentation listings may not be fully representative of all versions and/or variations of a product or machine; it is the detailed description in the listing that determines the documentation ultimately delivered via an internet link.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Deliveries are made exclusively by electronic means. An internet link is made available after receipt of payment. This link may also be a URL to a manufacturer&apos;s or distributor&apos;s website. The customer acknowledges that this link may be directly and freely accessible through a search engine.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            In effect, the service provided by Service Manuals Pro is to help customers locate these links. To access the desired documentation, simply click on the internet link. For practical purposes, Service Manuals Pro offers an online catalog. Through this service, documentation is organized by categories. This system allows users to browse the content of available documentation. Service Manuals Pro delivers this service without geographical restriction, provided the customer provides a valid email address and is able to pay for their order online.
          </p>
        </section>

        {/* Copyright */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Copyright &amp; Legal Compliance</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Service Manuals Pro provides download links (of a transitory nature) whose sole purpose is to enable lawful access to technical documentation. Their transmission occurs through a digital network. This does not appear to cause unjustified or intolerable harm to the legitimate interests of manufacturers or importers. This process does not violate Copyright, which is intended to protect the integrity of technical data and informational content. No modifications are made to the documentation.
          </p>
        </section>

        {/* Languages */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Languages &amp; Translation</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Documentation is available for download in its original language. Service Manuals Pro is neither the publisher nor the custodian of the documentation to which the links point on the Web; consequently, Service Manuals Pro cannot be held responsible if the customer does not obtain documentation precisely in their native language.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            The vast majority of links offered by Service Manuals Pro point to documentation in English and French (sometimes in German or Spanish), rarely in other languages. Some PDF documents with optical character recognition (OCR) allow perfect translation using ChatGPT (by copying and pasting paragraphs or pages) or with Google&apos;s automatic translation.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            As much as possible, Service Manuals Pro excludes documentation published in languages other than English and French, but some older original publications exist only in the language of the country where the equipment was manufactured; this is sometimes the case for equipment made in Russia (published in Cyrillic script during the Cold War, for example), China, Japan, etc. But even in these cases (if the PDF has OCR), it is possible to obtain a translation using ChatGPT or Google.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Your smartphone in &ldquo;Photo&rdquo; mode can also automatically translate (in the language of your choice) any text or documentation you present to it:{' '}
            <Link href="https://translate.google.com/intl/en/about/" className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
              Google Translate
            </Link>
          </p>
        </section>

        {/* Pricing */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Pricing</h2>
          <p className="text-gray-700 leading-relaxed">
            The amount charged for accessing documentation download links covers all technical, administrative, and management costs (depreciation of IT equipment, administration and updating of the online catalog, SEO referencing, etc.) but above all the time spent searching for documentation across all layers of the Web, including those not indexed by search engines (Deep Web).
          </p>
        </section>

        {/* Refund policy */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Refund Policy</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Consequently, our services are non-refundable:
          </p>
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-5">
            <p className="text-sm text-gray-800 leading-relaxed font-medium uppercase">
              Due to the nature and method of delivery, the customer acknowledges that they may under no circumstances exercise their legal right of withdrawal. Indeed, the access links made available are for immediate download. This falls within the specific framework of instantaneous delivery of dematerialized information.
            </p>
            <p className="text-sm text-gray-800 leading-relaxed font-medium uppercase mt-3">
              Only the technical inability to effectively download documentation (dead link, impossible access, corrupted or non-displayable file), as verified by our servers, may naturally be subject to a refund if our services are unable to deliver the order by alternative means.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
