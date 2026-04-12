import { Metadata } from 'next';
import Link from '@/components/ExternalLink';
import { AlertTriangle } from 'lucide-react';
import { getLocale } from '@/lib/locale';
import { SITE_URLS } from '@/lib/i18n';
import { headers } from 'next/headers';

export const runtime = 'edge';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (headers().get('x-locale') === 'fr' ? 'fr' : 'en') as 'en' | 'fr';
  const title = locale === 'fr'
    ? 'Politique de confidentialité | Service Manuels Pro'
    : 'Privacy Policy | Service Manuals Pro';
  const description = locale === 'fr'
    ? 'Politique de confidentialité, conditions générales d\u2019utilisation et conformité RGPD de Service Manuels Pro. Découvrez comment nous protégeons vos données personnelles.'
    : 'Privacy Policy, Terms of Use and GDPR compliance for Service Manuals Pro. Learn how we protect your personal data.';
  const base = SITE_URLS[locale];
  return {
    title,
    description,
    openGraph: { title, description, url: `${base}/privacy` },
    alternates: { canonical: `${base}/privacy` },
  };
}

export default function PrivacyPage() {
  const locale = getLocale();
  if (locale === 'fr') return <PrivacyFr />;
  return <PrivacyEn />;
}

function PrivacyFr() {
  const siteUrl = 'https://www.service-manuels-pro.fr';
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Conditions générales d&apos;utilisation et RGPD</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-8">

        {/* Attention */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h2 className="font-semibold text-amber-900 mb-2">Attention</h2>
              <p className="text-sm text-amber-800 leading-relaxed">
                L&apos;enregistrement des documentations se déroule correctement sur un ordinateur connecté à Internet et dont les applications sont à jour. Les smartphones et tablettes sont à éviter car ils ne disposent pas toujours du bon lecteur de PDF et/ou de la capacité mémoire pour « digérer » des documentations dont le contenu numérisé peut être conséquent.
              </p>
            </div>
          </div>
        </div>

        {/* Paiements */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Paiements</h2>
          <p className="text-gray-700 leading-relaxed">
            Comme de nombreuses entreprises, nous utilisons les services de{' '}
            <Link href="https://stripe.com/fr" className="text-emerald-700 hover:text-emerald-800 font-semibold underline underline-offset-2">
              STRIPE.COM
            </Link>{' '}
            pour sécuriser les paiements en ligne par carte bancaire de nos clients.
          </p>
        </section>

        {/* Article 1 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Article 1 : Éditeur</h2>
          <p className="text-gray-700 leading-relaxed">
            Le présent site web accessible à l&apos;adresse{' '}
            <Link href={siteUrl} className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
              {siteUrl}
            </Link>{' '}
            est édité par SHOP OF TECHNICAL DOCUMENTATIONS, établissement inscrit en Slovaquie sous le numéro de RCS 36807516, dont le siège social est situé Pôle d&apos;activité Lu&#x10D;eneck&#xe1; cesta 2266/6 &ndash; 96096 ZVOLEN &ndash; Slovaquie. Contact direct via le{' '}
            <Link href="/contact" className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
              formulaire en ligne
            </Link>.
          </p>
        </section>

        {/* Article 2 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Article 2 : Contenu du site</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Le contenu du Site, la structure générale, les textes, les sons, les images animées ou non, dont le Site{' '}
            <Link href={siteUrl} className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
              {siteUrl}
            </Link>{' '}
            est composé sont la propriété exclusive de Service Manuels Pro (SHOP OF TECHNICAL DOCUMENTATIONS). Toute représentation totale ou partielle de ce Site et de son Contenu, par quelques procédés que ce soient, sans l&apos;autorisation préalable expresse de Service Manuels Pro (SHOP OF TECHNICAL DOCUMENTATIONS) est interdite et constituerait une contrefaçon sanctionnée par les codes et lois internationales sur la propriété intellectuelle.
          </p>
          <p className="text-gray-700 leading-relaxed">
            La consultation du Site{' '}
            <Link href={siteUrl} className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
              {siteUrl}
            </Link>{' '}
            est subordonnée à l&apos;acceptation intégrale et au respect par les utilisateurs des conditions d&apos;utilisation suivantes.
          </p>
        </section>

        {/* Article 3 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Article 3 : Licence d&apos;utilisation du contenu</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Du seul fait de sa connexion au site, l&apos;utilisateur reconnaît accepter de Service Manuels Pro (SHOP OF TECHNICAL DOCUMENTATIONS) une licence d&apos;usage du Contenu du Site strictement limitée aux conditions impératives suivantes :
          </p>
          <ul className="space-y-3 text-gray-700 text-sm leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-emerald-700 font-bold mt-0.5">&bull;</span>
              <span>La présente licence est accordée à titre non exclusif et n&apos;est pas transmissible.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-700 font-bold mt-0.5">&bull;</span>
              <span>Le droit d&apos;usage conféré à l&apos;utilisateur est personnel et privé : toute reproduction du contenu du site sur un quelconque support pour un usage collectif ou professionnel, même en interne dans l&apos;entreprise, est prohibée. Il en est de même pour toute communication de ce contenu par voie électronique, même diffusé en intranet ou en extranet d&apos;entreprise.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-700 font-bold mt-0.5">&bull;</span>
              <span>Le droit d&apos;usage comprend seulement l&apos;autorisation de consulter le site et son contenu.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-700 font-bold mt-0.5">&bull;</span>
              <span>Cet usage comprend seulement l&apos;autorisation de reproduire pour stockage aux fins de représentation sur écran monoposte et de reproduction en un exemplaire, pour copie de sauvegarde et tirage papier. Tout autre usage est soumis à l&apos;autorisation expresse préalable de Service Manuels Pro (SHOP OF TECHNICAL DOCUMENTATIONS).</span>
            </li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-4">
            La violation de ces dispositions soumet le contrevenant et toutes personnes responsables aux peines pénales et civiles prévues par la loi et le RGPD.
          </p>
        </section>

        {/* Article 4 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Article 4 : Loi informatique, fichiers et libertés</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Service Manuels Pro (SHOP OF TECHNICAL DOCUMENTATIONS) est le responsable du traitement des données collectées sur le Site{' '}
            <Link href={siteUrl} className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
              {siteUrl}
            </Link>.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            L&apos;utilisateur est notamment informé que les informations personnelles qu&apos;il communique par les formulaires présents sur le Site sont nécessaires pour répondre à sa demande.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Les utilisateurs ont la possibilité d&apos;exercer leurs droits d&apos;accès, de rectification, d&apos;effacement, d&apos;opposition, de limitation du traitement, de portabilité de leurs données personnelles, droit de ne pas faire l&apos;objet d&apos;une décision individuelle automatisée et droit de révocation de leur consentement, concernant les données personnelles qu&apos;ils fournissent.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4 font-medium">
            Aucune de ces données personnelles ne seront cédées à des tierces personnes ou sociétés ; seul Service Manuels Pro (SHOP OF TECHNICAL DOCUMENTATIONS) utilisera ces données pour répondre aux demandes des utilisateurs et clients et pour les informer de ses activités.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Conformément aux dispositions du RGPD, l&apos;utilisateur bénéficie d&apos;un droit d&apos;accès, de rectification, de mise à jour et d&apos;effacement des informations qui le concernent, qu&apos;il peut exercer par contact direct via le{' '}
            <Link href="/contact" className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
              formulaire en ligne
            </Link>
            , en précisant dans l&apos;objet du message « Droit des personnes » et en joignant en pièce jointe la copie de son justificatif d&apos;identité.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            L&apos;utilisateur bénéficie également du droit de donner des directives sur le sort de ses données personnelles après son décès.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Conformément aux dispositions du RGPD, l&apos;utilisateur peut également s&apos;opposer, pour des motifs légitimes à ce que ses données fassent l&apos;objet d&apos;un traitement et, sans motif et sans frais, à ce que ses données soient utilisées à des fins de prospection commerciale.
          </p>
        </section>

        {/* Article 5 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Article 5 : Utilisation des cookies</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            L&apos;utilisateur est informé que lors de ses visites sur le Site{' '}
            <Link href={siteUrl} className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
              {siteUrl}
            </Link>
            , des cookies peuvent s&apos;installer automatiquement sur son logiciel de navigation. Le Site utilise des cookies nécessaires au bon fonctionnement du Site. Certains cookies permettent au site d&apos;identifier votre navigateur afin de conserver l&apos;information de connexion à votre compte, des informations concernant votre panier d&apos;achat, vos préférences, etc.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Les informations recueillies sur ce site seront conservées pendant une durée légale maximale de 3 ans, sauf obligation légale ou réglementaire contraire.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            L&apos;utilisateur dispose d&apos;un droit d&apos;accès, de retrait et de modification des données à caractère personnel communiquées par le biais des cookies dans les conditions décrites par le RGPD.
          </p>
          <p className="text-gray-700 leading-relaxed">
            L&apos;utilisateur du Site est tenu de respecter la loi dont la violation est passible de sanctions pénales. Il doit notamment s&apos;abstenir, s&apos;agissant des informations nominatives auxquelles il accède, de toute collecte, de toute utilisation détournée et, d&apos;une manière générale, de tout acte susceptible de porter atteinte à la vie privée ou à la réputation des personnes.
          </p>
        </section>

        {/* Article 6 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Article 6 : Les marques</h2>
          <p className="text-gray-700 leading-relaxed">
            Les marques pouvant figurer sur le Site{' '}
            <Link href={siteUrl} className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
              {siteUrl}
            </Link>{' '}
            sont des marques déposées. Toute reproduction totale ou partielle de ces marques sans autorisation expresse de Service Manuels Pro (SHOP OF TECHNICAL DOCUMENTATIONS) est donc prohibée.
          </p>
        </section>

        {/* Article 7 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Article 7 : Liens hypertextes</h2>
          <p className="text-gray-700 leading-relaxed">
            Les liens hypertextes mis en place dans le cadre du présent Site en direction d&apos;autres ressources présentes sur le réseau Internet ne sauraient engager la responsabilité de Service Manuels Pro (SHOP OF TECHNICAL DOCUMENTATIONS). Les utilisateurs du site ne peuvent mettre en place un lien hypertexte en direction de ce site sans l&apos;autorisation expresse et préalable de Service Manuels Pro (SHOP OF TECHNICAL DOCUMENTATIONS).
          </p>
        </section>

        {/* Article 8 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Article 8 : Autorisation de reproduction de contenus et de mise en place d&apos;hyperliens</h2>
          <p className="text-gray-700 leading-relaxed">
            Pour toute information et demande de reproduction d&apos;un contenu paru sur le Site{' '}
            <Link href={siteUrl} className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
              {siteUrl}
            </Link>{' '}
            (textes, graphiques, illustrations, etc.) quel qu&apos;en soit le support, comme pour toute autorisation de mise en place d&apos;un hyperlien, l&apos;utilisateur est invité à adresser sa demande par contact direct via le{' '}
            <Link href="/contact" className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
              formulaire en ligne
            </Link>.
          </p>
        </section>

        {/* Article 9 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Article 9 : Respect de la vie privée</h2>
          <p className="text-gray-700 leading-relaxed">
            Service Manuels Pro (SHOP OF TECHNICAL DOCUMENTATIONS) respecte votre vie privée et s&apos;engage à la protéger en conformité avec le RGPD. La présente déclaration est destinée à vous informer de notre politique et de nos pratiques en matière de respect de la vie privée, ainsi que des choix que vous pouvez opérer sur la manière dont vos coordonnées sont recueillies en ligne et comment elles sont utilisées. Service Manuels Pro (SHOP OF TECHNICAL DOCUMENTATIONS) garantit la confidentialité des données personnelles traitées et veille à ce que les personnes autorisées à traiter lesdites données personnelles s&apos;engagent également à respecter cette obligation de confidentialité.
          </p>
        </section>

        {/* Article 10 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Article 10 : Sécurité des données personnelles</h2>
          <p className="text-gray-700 leading-relaxed">
            Service Manuels Pro (SHOP OF TECHNICAL DOCUMENTATIONS) s&apos;engage, au titre de son obligation de moyens, à prendre toutes les précautions utiles et met en œuvre des mesures techniques et organisationnelles appropriées en la matière pour garantir un niveau de sécurité adapté et pour protéger les données personnelles des internautes contre les altérations, destructions et accès non autorisés.
          </p>
        </section>

      </div>
    </div>
  );
}

function PrivacyEn() {
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
            , is published by LA DOCUMENTATION TECHNIQUE (SHOP OF TECHNICAL DOCUMENTATIONS), a company registered in Slovakia under Trade Register No. 36807516, with its registered office at Business Hub Lu&#x10D;eneck&#xe1; cesta 2266/6 &ndash; 96096 ZVOLEN &ndash; Slovakia. Direct contact via the{' '}
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
            is composed are the exclusive property of LA DOCUMENTATION TECHNIQUE (SHOP OF TECHNICAL DOCUMENTATIONS). Any total or partial representation of this Website and its Content, by any means whatsoever, without the prior express authorization of LA DOCUMENTATION TECHNIQUE (SHOP OF TECHNICAL DOCUMENTATIONS) is prohibited and would constitute infringement punishable under international intellectual property codes and laws.
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
            By the mere act of connecting to the Website, the user acknowledges accepting from LA DOCUMENTATION TECHNIQUE (SHOP OF TECHNICAL DOCUMENTATIONS) a license to use the Website Content strictly limited to the following mandatory conditions:
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
              <span>This use includes only the authorization to reproduce for storage purposes for display on a single screen and to reproduce in one copy for backup and paper printout. Any other use is subject to the prior express authorization of LA DOCUMENTATION TECHNIQUE (SHOP OF TECHNICAL DOCUMENTATIONS).</span>
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
            LA DOCUMENTATION TECHNIQUE (SHOP OF TECHNICAL DOCUMENTATIONS) is the data controller for data collected on the Website{' '}
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
            None of this personal data will be transferred to third parties or companies; only LA DOCUMENTATION TECHNIQUE (SHOP OF TECHNICAL DOCUMENTATIONS) will use this data to respond to user and customer requests and to inform them of its activities.
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
            are registered trademarks. Any total or partial reproduction of these trademarks without the express authorization of LA DOCUMENTATION TECHNIQUE (SHOP OF TECHNICAL DOCUMENTATIONS) is therefore prohibited.
          </p>
        </section>

        {/* Article 7 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Article 7: Hyperlinks</h2>
          <p className="text-gray-700 leading-relaxed">
            Hyperlinks set up on this Website directing to other resources on the Internet shall not engage the responsibility of LA DOCUMENTATION TECHNIQUE (SHOP OF TECHNICAL DOCUMENTATIONS). Users of the Website may not set up a hyperlink to this site without the prior express authorization of LA DOCUMENTATION TECHNIQUE (SHOP OF TECHNICAL DOCUMENTATIONS).
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
            LA DOCUMENTATION TECHNIQUE (SHOP OF TECHNICAL DOCUMENTATIONS) respects your privacy and is committed to protecting it in accordance with the GDPR. This statement is intended to inform you of our privacy policy and practices, as well as the choices you can make about how your personal information is collected online and how it is used. LA DOCUMENTATION TECHNIQUE (SHOP OF TECHNICAL DOCUMENTATIONS) guarantees the confidentiality of personal data processed and ensures that authorized persons processing said personal data also commit to respecting this obligation of confidentiality.
          </p>
        </section>

        {/* Article 10 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Article 10: Personal Data Security</h2>
          <p className="text-gray-700 leading-relaxed">
            LA DOCUMENTATION TECHNIQUE (SHOP OF TECHNICAL DOCUMENTATIONS) commits, as part of its obligation of means, to take all necessary precautions and implements appropriate technical and organizational measures to ensure an adequate level of security and to protect users&apos; personal data against alteration, destruction, and unauthorized access.
          </p>
        </section>

      </div>
    </div>
  );
}
