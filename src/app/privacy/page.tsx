import { Metadata } from 'next';
import Link from '@/components/ExternalLink';
import { AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | Service Manuals Pro',
  description: 'Privacy Policy, Terms of Use and GDPR compliance for Service Manuals Pro. Learn how we protect your personal data.',
  openGraph: {
    title: 'Privacy Policy | Service Manuals Pro',
    description: 'Privacy Policy and GDPR compliance for Service Manuals Pro.',
  },
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy &amp; Terms of Use (GDPR)</h1>

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
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Payments</h2>
          <p className="text-gray-700 leading-relaxed">
            Like many businesses, we use the services of{' '}
            <Link href="https://stripe.com" className="text-emerald-700 hover:text-emerald-800 font-semibold underline underline-offset-2">
              STRIPE.COM
            </Link>{' '}
            to secure online card payments for our customers.
          </p>
        </section>

        {/* Article 1 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Article 1: Publisher</h2>
          <p className="text-gray-700 leading-relaxed">
            This website, accessible at{' '}
            <Link href="https://www.service-manuals-pro.com" className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
              https://www.service-manuals-pro.com
            </Link>
            , is published by SHOP OF TECHNICAL DOCUMENTATIONS, a company registered in Slovakia under Trade Register No. 36807516, with its registered office at Business Hub Lu&#x10D;eneck&#xe1; cesta 2266/6 &ndash; 96096 ZVOLEN &ndash; Slovakia. Direct contact via the{' '}
            <Link href="/contact" className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
              online contact page
            </Link>.
          </p>
        </section>

        {/* Article 2 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Article 2: Website Content</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            The content of the Website, the general structure, texts, sounds, images (animated or otherwise) of which{' '}
            <Link href="https://www.service-manuals-pro.com" className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
              https://www.service-manuals-pro.com
            </Link>{' '}
            is composed are the exclusive property of SHOP OF TECHNICAL DOCUMENTATIONS. Any total or partial representation of this Website and its Content, by any means whatsoever, without the prior express authorization of SHOP OF TECHNICAL DOCUMENTATIONS is prohibited and would constitute infringement punishable under international intellectual property codes and laws.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Use of the Website{' '}
            <Link href="https://www.service-manuals-pro.com" className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
              https://www.service-manuals-pro.com
            </Link>{' '}
            is subject to full acceptance of and compliance with the following terms of use by all users.
          </p>
        </section>

        {/* Article 3 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Article 3: Content License</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            By the mere act of connecting to the Website, the user acknowledges accepting from SHOP OF TECHNICAL DOCUMENTATIONS a license to use the Website Content strictly limited to the following mandatory conditions:
          </p>
          <ul className="space-y-3 text-gray-700 text-sm leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-emerald-700 font-bold mt-0.5">&bull;</span>
              <span>This license is granted on a non-exclusive basis and is not transferable.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-700 font-bold mt-0.5">&bull;</span>
              <span>The right of use granted to the user is personal and private: any reproduction of the Website content on any medium for collective or professional use, even internally within a company, is prohibited. The same applies to any electronic communication of this content, even distributed via a company&apos;s intranet or extranet.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-700 font-bold mt-0.5">&bull;</span>
              <span>The right of use includes only the authorization to view the Website and its content.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-700 font-bold mt-0.5">&bull;</span>
              <span>This use includes only the authorization to reproduce for storage purposes for display on a single screen and to reproduce in one copy for backup and paper printout. Any other use is subject to the prior express authorization of SHOP OF TECHNICAL DOCUMENTATIONS.</span>
            </li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-4">
            Violation of these provisions subjects the offender and all responsible persons to the criminal and civil penalties provided by law and the GDPR.
          </p>
        </section>

        {/* Article 4 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Article 4: Data Protection &amp; Privacy</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            SHOP OF TECHNICAL DOCUMENTATIONS is the data controller for data collected on the Website{' '}
            <Link href="https://www.service-manuals-pro.com" className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
              https://www.service-manuals-pro.com
            </Link>.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Users are informed that personal information communicated through forms on the Website is necessary to respond to their request and is intended solely for authorized personnel responsible for handling and responding to their request for follow-up purposes.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Users have the right to exercise their rights of access, rectification, erasure, objection, restriction of processing, portability of personal data, the right not to be subject to automated individual decision-making, and the right to revoke consent regarding the personal data they provide.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4 font-medium">
            None of this personal data will be transferred to third parties or companies; only SHOP OF TECHNICAL DOCUMENTATIONS will use this data to respond to user and customer requests and to inform them of its activities.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            In accordance with the GDPR provisions, users have the right of access, rectification, updating, and erasure of their personal data, which they may exercise by direct contact via the{' '}
            <Link href="/contact" className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
              online contact page
            </Link>
            , specifying &ldquo;Data Subject Rights&rdquo; in the subject line and attaching a copy of their proof of identity.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Users also have the right to give instructions regarding the fate of their personal data after their death.
          </p>
          <p className="text-gray-700 leading-relaxed">
            In accordance with the GDPR provisions, users may also object, on legitimate grounds, to the processing of their data and, without reason and free of charge, to the use of their data for commercial prospecting purposes.
          </p>
        </section>

        {/* Article 5 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Article 5: Cookies</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Users are informed that when visiting the Website{' '}
            <Link href="https://www.service-manuals-pro.com" className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
              https://www.service-manuals-pro.com
            </Link>
            , cookies may be automatically installed on their browser software. The Website uses cookies necessary for the proper functioning of the site. Some cookies allow the website to identify your browser in order to retain login information for your account, information about your shopping cart, your preferences, etc.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Information collected on this site will be retained for a maximum legal period of 3 years, unless contrary legal or regulatory obligations apply.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Users have the right of access, withdrawal, and modification of personal data communicated through cookies under the conditions described by the GDPR.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Users of the Website are required to comply with the law, the violation of which is subject to criminal penalties. They must refrain, with regard to personal information they access, from any collection, any misuse, and generally any act likely to infringe on the privacy or reputation of individuals.
          </p>
        </section>

        {/* Article 6 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Article 6: Trademarks</h2>
          <p className="text-gray-700 leading-relaxed">
            Trademarks appearing on the Website{' '}
            <Link href="https://www.service-manuals-pro.com" className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
              https://www.service-manuals-pro.com
            </Link>{' '}
            are registered trademarks. Any total or partial reproduction of these trademarks without the express authorization of SHOP OF TECHNICAL DOCUMENTATIONS is therefore prohibited.
          </p>
        </section>

        {/* Article 7 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Article 7: Hyperlinks</h2>
          <p className="text-gray-700 leading-relaxed">
            Hyperlinks set up on this Website directing to other resources on the Internet shall not engage the responsibility of SHOP OF TECHNICAL DOCUMENTATIONS. Users of the Website may not set up a hyperlink to this site without the prior express authorization of SHOP OF TECHNICAL DOCUMENTATIONS.
          </p>
        </section>

        {/* Article 8 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Article 8: Content Reproduction</h2>
          <p className="text-gray-700 leading-relaxed">
            For any information and request for reproduction of content published on the Website{' '}
            <Link href="https://www.service-manuals-pro.com" className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
              https://www.service-manuals-pro.com
            </Link>{' '}
            (texts, graphics, illustrations, etc.) regardless of the medium, as well as for any authorization to set up a hyperlink, users are invited to submit their request via direct contact through the{' '}
            <Link href="/contact" className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
              online contact page
            </Link>.
          </p>
        </section>

        {/* Article 9 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Article 9: Privacy</h2>
          <p className="text-gray-700 leading-relaxed">
            SHOP OF TECHNICAL DOCUMENTATIONS respects your privacy and is committed to protecting it in accordance with the GDPR. This statement is intended to inform you of our privacy policy and practices, as well as the choices you can make about how your personal information is collected online and how it is used. SHOP OF TECHNICAL DOCUMENTATIONS guarantees the confidentiality of personal data processed and ensures that authorized persons processing said personal data also commit to respecting this obligation of confidentiality.
          </p>
        </section>

        {/* Article 10 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Article 10: Personal Data Security</h2>
          <p className="text-gray-700 leading-relaxed">
            SHOP OF TECHNICAL DOCUMENTATIONS commits, as part of its obligation of means, to take all necessary precautions and implements appropriate technical and organizational measures to ensure an adequate level of security and to protect users&apos; personal data against alteration, destruction, and unauthorized access.
          </p>
        </section>

      </div>
    </div>
  );
}
