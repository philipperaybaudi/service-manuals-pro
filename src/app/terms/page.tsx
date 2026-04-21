import { Metadata } from 'next';
import Link from '@/components/ExternalLink';
import { AlertTriangle } from 'lucide-react';
import { getLocale } from '@/lib/locale';
import { SITE_URLS, tr } from '@/lib/i18n';
import { headers } from 'next/headers';

export const runtime = 'edge';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (headers().get('x-locale') === 'fr' ? 'fr' : 'en') as 'en' | 'fr';
  const title = locale === 'fr'
    ? 'Conditions générales de vente | Service Manuels Pro'
    : 'Terms of Service | Service Manuals Pro';
  const description = locale === 'fr'
    ? 'Conditions générales de vente de Service Manuels Pro. Informations sur les paiements, téléchargements, politique de remboursement et services de documentation.'
    : 'Terms of Service and General Conditions of Sale for Service Manuals Pro. Information about payments, downloads, refund policy and documentation services.';
  const base = SITE_URLS[locale];
  return {
    title,
    description,
    openGraph: { title, description, url: `${base}/terms` },
    alternates: { canonical: `${base}/terms` },
  };
}

export default function TermsPage() {
  const locale = getLocale();

  if (locale === 'fr') {
    return <TermsFr />;
  }
  return <TermsEn />;
}

function TermsFr() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Conditions générales de vente</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-8">
        {/* Attention */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h2 className="font-semibold text-amber-900 mb-2">Attention — Accès aux documentations</h2>
              <p className="text-sm text-amber-800 leading-relaxed">
                L&apos;enregistrement des documentations fonctionne correctement sur un ordinateur connecté à Internet avec des applications à jour. Les smartphones et tablettes sont à éviter car ils ne disposent pas toujours du bon lecteur de PDF et/ou d&apos;une capacité mémoire suffisante pour gérer des documentations dont le contenu numérisé peut être conséquent.
              </p>
            </div>
          </div>
        </div>

        {/* Paiements */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Paiements</h2>
          <p className="text-gray-700 leading-relaxed">
            Comme de nombreuses entreprises, nous utilisons les services de{' '}
            <Link href="https://stripe.com/fr" className="text-emerald-700 hover:text-emerald-800 font-semibold underline underline-offset-2">
              STRIPE.COM
            </Link>{' '}
            pour sécuriser les paiements en ligne par carte bancaire de nos clients.
          </p>
        </section>

        {/* Droit à la réparation */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Le{' '}
            <Link href="https://fr.wikipedia.org/wiki/Droit_%C3%A0_la_r%C3%A9paration" className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
              droit à la réparation
            </Link>
            *
          </h2>
          <h3 className="text-lg font-medium text-gray-800 mb-3">Trouvez la documentation dont vous avez besoin !</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Dans un monde idéal, chaque machine devrait être livrée avec une documentation rédigée dans la langue du client final. Cependant, certains fabricants n&apos;archivent pas leurs documentations techniques. En outre, ils n&apos;hésitent pas à répondre que le document demandé n&apos;est plus disponible. Ils préfèrent souvent vendre du matériel neuf.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Service Manuels Pro propose son aide dans ces situations en donnant accès à une multitude de documents numérisés.
          </p>
        </section>

        {/* Indépendance */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Indépendance</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Service Manuels Pro n&apos;est affilié à aucun fabricant. Par conséquent, Service Manuels Pro n&apos;assure pas le service après-vente d&apos;une marque particulière. Son unique rôle consiste à rechercher pour vous les informations dont vous avez besoin. Par ailleurs, la documentation est mise à disposition sous un format permettant une livraison rapide par voie électronique. Les documents numérisés sont généralement au format PDF. C&apos;est cette mise à disposition d&apos;un lien de téléchargement que vous payez.
          </p>
        </section>

        {/* Téléchargement ordinateur */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h2 className="font-semibold text-amber-900 mb-2">Important</h2>
              <p className="text-sm text-amber-800 leading-relaxed">
                Du fait du poids des fichiers, les documentations doivent être téléchargées sur un ordinateur (PC, Mac ou Linux). Les téléphones et tablettes sont généralement incapables d&apos;enregistrer de grosses documentations. Si ces consignes ne sont pas respectées, Service Manuels Pro ne saurait être tenu pour responsable si le client ne parvient pas à ouvrir, consulter, enregistrer ou imprimer la documentation commandée.
              </p>
            </div>
          </div>
        </div>

        {/* Nature du service */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Nature du service</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Service Manuels Pro est avant tout un service de mise à disposition et de recherche de documentations. Ces documents couvrent différents types de matériels, tutoriels, cours et logiciels : notices, modes d&apos;emploi, manuels de service, schémas électroniques, éclatés mécaniques, nomenclatures de pièces, procédures d&apos;étalonnage, notices de montage, manuels d&apos;utilisation, manuels d&apos;entretien, tutoriels de formation, etc. Cette liste n&apos;est pas exhaustive et pourra évoluer en fonction des demandes des utilisateurs.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Les images illustrant les fiches documentaires peuvent ne pas être totalement représentatives de toutes les versions et/ou variantes d&apos;un produit ou d&apos;une machine ; c&apos;est la description détaillée de la fiche qui détermine la documentation finalement livrée via un lien internet.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Les livraisons se font exclusivement par voie électronique. Un lien internet est mis à disposition après réception du paiement. Ce lien peut également être une URL vers le site d&apos;un fabricant ou d&apos;un distributeur. Le client reconnaît que ce lien peut être directement et librement accessible via un moteur de recherche.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            En effet, le service rendu par Service Manuels Pro est d&apos;aider les clients à localiser ces liens. Pour accéder à la documentation recherchée, il suffit de cliquer sur le lien internet. Pour des raisons pratiques, Service Manuels Pro propose un catalogue en ligne. Grâce à ce service, les documentations sont classées par catégories. Ce système permet de naviguer dans le contenu des documentations disponibles. Service Manuels Pro fournit ce service sans restriction géographique, sous réserve que le client fournisse une adresse email valide et puisse régler sa commande en ligne.
          </p>
        </section>

        {/* Au sujet des descriptifs */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Au sujet des descriptifs</h2>
          <p className="text-gray-700 leading-relaxed">
            Les descriptifs des fiches de chaque documentation ont été générés automatiquement après lecture des PDF par un programme informatique. Cela peut avoir généré des imperfections ou des erreurs dans les textes de ces descriptifs et nous ne pouvons en être tenus pour responsables, dans la mesure où lire des milliers de documentations aurait occupé un opérateur humain pendant des années (ce qui n&apos;aurait pas empêché quelques erreurs). Si vous trouvez des descriptions incorrectes ou incomplètes, n&apos;hésitez pas à nous en faire part.
          </p>
        </section>

        {/* Droit d'auteur */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Droit d&apos;auteur &amp; conformité légale</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Service Manuels Pro fournit des liens de téléchargement (à caractère transitoire) dont l&apos;unique objet est de permettre un accès licite à des documentations techniques. Leur transmission s&apos;opère via un réseau numérique. Cela ne semble pas causer de préjudice injustifié ou intolérable aux intérêts légitimes des fabricants ou importateurs. Ce procédé ne porte pas atteinte au droit d&apos;auteur, qui vise à protéger l&apos;intégrité des données techniques et du contenu informationnel. Aucune modification n&apos;est apportée à la documentation.
          </p>
        </section>

        {/* Langues */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Langues d&apos;édition &amp; traduction</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Les documentations sont téléchargeables dans leur langue d&apos;origine. Service Manuels Pro n&apos;est ni éditeur ni dépositaire des documentations vers lesquelles les liens pointent sur le Web ; par conséquent, Service Manuels Pro ne saurait être tenu pour responsable si le client n&apos;obtient pas précisément une documentation dans sa langue maternelle.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            La très grande majorité des liens proposés par Service Manuels Pro pointent vers des documentations en anglais et en français (parfois en allemand ou espagnol), rarement dans d&apos;autres langues. Certains PDF avec reconnaissance optique de caractères (OCR) permettent une traduction parfaite via ChatGPT (en copiant-collant paragraphes ou pages) ou avec la traduction automatique de Google.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Dans la mesure du possible, Service Manuels Pro exclut les documentations publiées dans des langues autres que le français et l&apos;anglais, mais certaines publications originales anciennes n&apos;existent que dans la langue du pays où le matériel a été fabriqué ; c&apos;est parfois le cas pour du matériel fabriqué en Russie (publié en caractères cyrilliques pendant la Guerre froide, par exemple), en Chine, au Japon, etc. Mais même dans ces cas (si le PDF possède une OCR), il est possible d&apos;obtenir une traduction via ChatGPT ou Google.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Votre smartphone en mode « Photo » peut aussi traduire automatiquement (dans la langue de votre choix) tout texte ou documentation que vous lui présentez :{' '}
            <Link href="https://translate.google.com/intl/fr/about/" className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
              Google Traduction
            </Link>
          </p>
        </section>

        {/* Prix */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Prix des prestations</h2>
          <p className="text-gray-700 leading-relaxed">
            Le montant demandé pour accéder aux liens de téléchargement des documents permet de couvrir l&apos;ensemble des frais techniques, administratifs et de gestion (amortissement du matériel informatique, administration et mise à jour du catalogue en ligne, référencement SEO, etc.) mais surtout le temps consacré à la recherche de documentation sur l&apos;ensemble des couches du Web, y compris celles non indexées par les moteurs de recherche (Deep Web).
          </p>
        </section>

        {/* Non-remboursement */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Politique de non-remboursement</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Par conséquent, nos prestations ne sont pas remboursables :
          </p>
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-5">
            <p className="text-sm text-gray-800 leading-relaxed font-medium uppercase">
              En raison de la nature et du mode de livraison, le client reconnaît qu&apos;il ne pourra en aucun cas exercer son délai légal de rétractation. En effet, les liens d&apos;accès mis à disposition permettent un téléchargement immédiat. Cela s&apos;inscrit dans le cadre spécifique de la livraison instantanée d&apos;informations dématérialisées.
            </p>
            <p className="text-sm text-gray-800 leading-relaxed font-medium uppercase mt-3">
              Seule l&apos;incapacité technique de téléchargement effectif d&apos;une documentation (lien mort, accès impossible, fichier corrompu ou non affichable), constatée par nos serveurs, pourra naturellement faire l&apos;objet d&apos;un remboursement si nos services ne peuvent livrer la commande par d&apos;autres moyens.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}

function TermsEn() {
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

        {/* About descriptions */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">About Descriptions</h2>
          <p className="text-gray-700 leading-relaxed">
            The descriptions on each documentation listing were automatically generated after the PDF files were read by a computer program. This process may have introduced imperfections or errors in the description texts, and we cannot be held responsible for these, given that reading thousands of documents would have kept a human operator busy for years (which would not have prevented some errors anyway). If you find any incorrect or incomplete descriptions, please do not hesitate to let us know.
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
