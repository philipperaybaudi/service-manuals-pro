export type Locale = 'en' | 'fr';

export const SITE_NAMES: Record<Locale, string> = {
  en: 'Service Manuals Pro',
  fr: 'Service Manuels Pro',
};

export const SITE_URLS: Record<Locale, string> = {
  en: 'https://www.service-manuals-pro.com',
  fr: 'https://service-manuels-pro.fr',
};

const en = {
  // ─── Header ─────────────────────────────────────────────────
  'header.search_placeholder': 'Search manuals... (e.g. Nikon F3, Stihl MS 250)',
  'header.search_placeholder_mobile': 'Search manuals...',
  'header.all_categories': 'All Categories',
  'header.featured': 'Featured',
  'header.toggle_menu': 'Toggle menu',

  // ─── Footer ─────────────────────────────────────────────────
  'footer.tagline':
    "The world's largest collection of professional technical documentation. Service manuals, repair guides, schematics and wiring diagrams.",
  'footer.stripe_note': 'Secure payments by Stripe',
  'footer.categories': 'Categories',
  'footer.popular_brands': 'Popular Brands',
  'footer.information': 'Information',
  'footer.about': 'About Us',
  'footer.contact': 'Contact',
  'footer.terms': 'Terms of Service',
  'footer.privacy': 'Privacy Policy',
  'footer.rights': 'All rights reserved.',
  'footer.right_to_repair': 'Supporting the Right to Repair movement',

  // ─── Home ────────────────────────────────────────────────────
  'home.hero_badge': 'Right to Repair — Access Technical Documentation',
  'home.hero_title_line1': 'Professional Service Manuals',
  'home.hero_title_line2': 'Instant PDF Download',
  'home.hero_subtitle':
    "One of the largest collections of technical documentation. Repair guides, schematics, and workshop manuals for professionals and enthusiasts.",
  'home.hero_search_placeholder': 'Search...',
  'home.stats_manuals': 'Manuals',
  'home.stats_brands': 'Brands',
  'home.stats_categories': 'Categories',
  'home.trust_instant_title': 'Instant Download',
  'home.trust_instant_desc': 'Immediate access',
  'home.trust_secure_title': 'Secure Payment',
  'home.trust_secure_desc': 'Powered by Stripe',
  'home.trust_quality_title': 'Quality PDFs',
  'home.trust_quality_desc': 'Professional docs',
  'home.trust_worldwide_title': 'Worldwide',
  'home.trust_worldwide_desc': '190+ countries',
  'home.browse_title': 'Browse by Category',
  'home.browse_subtitle': 'Find the documentation you need',
  'home.view_all': 'View all →',
  'home.featured_title': 'Featured Manuals',
  'home.recent_title': 'Recently Added',
  'home.seo_title': 'Your Source for Professional Technical Documentation',
  'home.seo_p1':
    'Service Manuals Pro is a marketplace dedicated to professional technical documentation. We provide service manuals, repair guides, electronic and mechanical schematics, and wiring diagrams for a wide range of equipment and devices.',
  'home.seo_p2':
    "Whether you're a professional technician, a repair shop owner, or an enthusiast who enjoys restoring vintage equipment, our technical documentation library will help you get the job done right. From repair manuals for vintage cameras, telecommunications and sound recording equipment, biomedical devices, and more, to automotive workshop manuals and machine tool guides, we source the documentation you need.",
  'home.seo_p3':
    'All documents are available for instant download in PDF format after secure payment via Stripe. No subscription required—pay once and download immediately.',
  'home.search_results_for': 'Search results for',
  'home.documents_found': 'documents found',
  'home.document_found': 'document found',
  'home.no_results': 'No documents found. Try different keywords.',

  // ─── DocCard / Categories ───────────────────────────────────
  'doc.featured_badge': 'Featured',
  'doc.pdf_document': 'PDF Document',
  'doc.manuals': 'manuals',
  'doc.manual': 'manual',
  'doc.brands': 'brands',
  'doc.brand': 'brand',

  // ─── Document page ──────────────────────────────────────────
  'docpage.by': 'by',
  'docpage.buy_now': 'Buy Now',
  'docpage.instant_download': 'Instant PDF download after payment',
  'docpage.link_valid_24h': 'Download link valid for 24 hours',
  'docpage.stripe_secure': 'Secure payment via Stripe',
  'docpage.details': 'Document Details',
  'docpage.format': 'Format',
  'docpage.pages': 'Pages',
  'docpage.size': 'Size',
  'docpage.language': 'Language',
  'docpage.category': 'Category',
  'docpage.related': 'Related Documents',
  'docpage.email_placeholder': 'Your email address',
  'docpage.email_invalid': 'Please enter a valid email address.',
  'docpage.generic_error': 'Something went wrong. Please try again.',
  'docpage.pay': 'Pay',
  'docpage.buy_now_prefix': 'Buy Now —',

  // ─── Download notice ────────────────────────────────────────
  'notice.computer_required': 'Documentation must be downloaded on a computer',
  'notice.computer_details': '(PC, Mac, or Linux).',
  'notice.no_mobile':
    'Do not use a smartphone or tablet to download documentation; they generally lack sufficient memory capacity to handle large files, and few users know how to locate the download folder on these devices.',
  'notice.translate':
    'Once downloaded, you can use it right away and even print the pages you need, or use your smartphone in photo mode to translate into the language of your choice:',
  'notice.google_translate': 'Google Translate',

  // ─── Categories list page ───────────────────────────────────
  'categories.title': 'All Categories',
  'categories.subtitle': 'Browse our complete documentation library',

  // ─── Category detail page ───────────────────────────────────
  'category.brands': 'Brands',
  'category.documents': 'Documents',
  'category.all_brands': 'All Brands',
  'category.filter_by_brand': 'Filter by brand',
  'category.home': 'Home',
  'category.categories': 'Categories',
  'category.service_manuals_suffix': 'Service Manuals',
  'category.browse_by_brand': 'Browse by Brand',
  'category.all_prefix': 'All',
  'category.all_suffix': 'Manuals',
  'category.meta_title_suffix': 'Service Manuals | Repair Guides & Schematics',
  'category.meta_description_fallback': 'Download professional service manuals. Repair guides, schematics, and technical documentation.',
  'category.brand_filter_title': 'Brand',
  'category.back_to_category': 'Back to category',
  'category.brand_subtitle_suffix': 'available for download',
  'category.no_manuals_for': 'No manuals available yet for',

  // ─── About ──────────────────────────────────────────────────
  'about.title': 'About Us',
  'about.right_to_repair_heading_prefix': 'The',
  'about.right_to_repair_link': 'Right to Repair',
  'about.intro': 'Find the documentation you need on this site!',
  'about.search_text': 'Find a user manual, an instruction booklet, a service manual, or any technical documentation regardless of the brand.',
  'about.archive_text': 'You can archive your user manuals and instruction booklets (or your workshop service manuals) to consult them later and ensure the maintenance or repair of your equipment.',
  'about.search_hint_prefix': 'Enter your search in the',
  'about.search_hint_field': 'Search manuals...',
  'about.search_hint_suffix': 'field at the top of the page.',
  'about.deep_web_text': 'If you cannot find the documentation you are looking for on this site, we can search for you across the vastness of the Internet and even the Deep Web, at no additional research cost.',
  'about.contact_prefix': "Don't hesitate to",
  'about.contact_link': 'contact us',
  'about.meta_title': 'About Us | Service Manuals Pro',
  'about.meta_description': 'Service Manuals Pro supports the Right to Repair. Find user manuals, service manuals, schematics and technical documentation for any brand.',

  // ─── Contact ────────────────────────────────────────────────
  'contact.title': 'Contact',
  'contact.name': 'Name',
  'contact.email': 'Email',
  'contact.subject': 'Subject',
  'contact.message': 'Message',
  'contact.send': 'Send message',
  'contact.success': 'Your message has been sent. We will reply as soon as possible.',
  'contact.error': 'An error occurred. Please try again.',
  'contact.intro': 'Have a question? Need help finding a manual? Send us a message.',
  'contact.meta_title': 'Contact Us | Service Manuals Pro',
  'contact.meta_description': 'Contact Service Manuals Pro for any question about our technical documentation, custom research requests, or support.',
  'contact.page_subtitle': "We're here to help. Don't hesitate to reach out.",
  'contact.email_card_title': 'Email',
  'contact.email_card_text': "Send us an email and we'll get back to you as soon as possible.",
  'contact.response_card_title': 'Response Time',
  'contact.response_card_text_prefix': 'We typically respond within',
  'contact.response_card_text_time': '72 hours',
  'contact.response_card_text_suffix': 'during business days.',
  'contact.company_title': 'Company Details',
  'contact.company_name_1': 'LA DOCUMENTATION TECHNIQUE',
  'contact.company_name_2': 'SHOP OF TECHNICAL DOCUMENTATIONS',
  'contact.company_register_label': 'Zvolen Trade Register No.:',
  'contact.for_inquiry_prefix': 'For any inquiry, please contact us at',
  'contact.how_help_title': 'How can we help?',
  'contact.help_research_title': 'Custom Documentation Research',
  'contact.help_research_text': "Can't find the manual you need? We can search across the Internet and even the Deep Web for you, at no additional research cost.",
  'contact.help_order_title': 'Order Support',
  'contact.help_order_text': "Questions about a purchase, download link, or payment? We're here to help.",
  'contact.help_general_title': 'General Inquiries',
  'contact.help_general_text': "Any other question or suggestion? We'd love to hear from you.",
  'contact.send_email_button': 'Send us an email',

  // ─── Terms ──────────────────────────────────────────────────
  'terms.title': 'Terms of Service',

  // ─── Privacy ────────────────────────────────────────────────
  'privacy.title': 'Privacy Policy',

  // ─── Download pages ─────────────────────────────────────────
  'download.success_title': 'Payment successful',
  'download.success_message':
    'Your payment has been received. A download link has been sent to your email address.',
  'download.back_home': 'Back to home',
  'download.expired': 'This download link has expired.',
  'download.link_title': 'Your download',
  'download.click_to_download': 'Click to download',
  'download.success_heading': 'Payment Successful!',
  'download.success_subtitle': 'Thank you for your purchase. Your download link is on its way.',
  'download.check_email_title': 'Check your email',
  'download.check_email_text': "We've sent a download link to your email address. Check your inbox (and spam folder).",
  'download.link_24h_title': 'Link valid for 24 hours',
  'download.link_24h_text': 'Your download link expires in 24 hours. You can download the file up to 3 times.',
  'download.need_help_title': 'Need help?',
  'download.need_help_text': "If you don't receive the email within a few minutes, please contact us.",
  'download.back_homepage': '← Back to homepage',
  'download.invalid_title': 'Invalid Download Link',
  'download.invalid_text': 'This download link is not valid. Please check your email for the correct link.',
  'download.expired_title': 'Download Link Expired',
  'download.expired_text': 'This download link has expired. Please contact support for assistance.',
  'download.limit_title': 'Download Limit Reached',
  'download.limit_text': 'You have reached the maximum number of downloads (3). Please contact support if you need further access.',
  'download.files_ready': 'Your Files are Ready',
  'download.bundle_contains_prefix': 'This bundle contains',
  'download.bundle_contains_suffix': 'files. Click each button to download.',
  'download.remaining_prefix': 'You can access this page',
  'download.remaining_more_time': 'more time',
  'download.remaining_more_times': 'more times',
  'download.last_access': 'This was your last access to this download page.',
  'download.meta_success': 'Payment Successful',
  'download.meta_token': 'Download Your Manual',

  // ─── Search ─────────────────────────────────────────────────
  'search.placeholder': 'Search documentation...',
  'search.button': 'Search',

  // ─── Metadata (SEO) ─────────────────────────────────────────
  'meta.default_title': 'Service Manuals Pro | Professional Technical Documentation Downloads',
  'meta.default_description':
    "The world's largest collection of professional service manuals, repair guides, schematics and wiring diagrams. Instant PDF download for cameras, audio, automotive, electronics and more.",
  'meta.og_title': 'Service Manuals Pro | Professional Technical Documentation',
  'meta.og_description':
    'Download professional service manuals, repair guides and schematics. Instant PDF delivery.',
  'meta.twitter_description': 'Professional technical documentation for instant download.',
} as const;

const fr: Record<keyof typeof en, string> = {
  // ─── Header ─────────────────────────────────────────────────
  'header.search_placeholder': 'Rechercher un manuel... (ex. Nikon F3, Stihl MS 250)',
  'header.search_placeholder_mobile': 'Rechercher un manuel...',
  'header.all_categories': 'Toutes les catégories',
  'header.featured': 'Mis en avant',
  'header.toggle_menu': 'Ouvrir le menu',

  // ─── Footer ─────────────────────────────────────────────────
  'footer.tagline':
    "La plus grande collection mondiale de documentation technique professionnelle. Manuels de service, guides de réparation, schémas et plans de câblage.",
  'footer.stripe_note': 'Paiements sécurisés par Stripe',
  'footer.categories': 'Catégories',
  'footer.popular_brands': 'Marques populaires',
  'footer.information': 'Informations',
  'footer.about': 'À propos',
  'footer.contact': 'Contact',
  'footer.terms': "Conditions générales de vente",
  'footer.privacy': "Politique de confidentialité",
  'footer.rights': 'Tous droits réservés.',
  'footer.right_to_repair': 'Nous soutenons le droit à la réparation',

  // ─── Home ────────────────────────────────────────────────────
  'home.hero_badge': 'Droit à la réparation — Accès à la documentation technique',
  'home.hero_title_line1': 'Manuels de service professionnels',
  'home.hero_title_line2': 'Téléchargement PDF immédiat',
  'home.hero_subtitle':
    "Une des plus grandes collections de documentations techniques. Guides de réparation, schémas et manuels d'atelier pour professionnels et passionnés.",
  'home.hero_search_placeholder': 'Recherche...',
  'home.stats_manuals': 'Manuels',
  'home.stats_brands': 'Marques',
  'home.stats_categories': 'Catégories',
  'home.trust_instant_title': 'Téléchargement immédiat',
  'home.trust_instant_desc': 'Accès instantané',
  'home.trust_secure_title': 'Paiement sécurisé',
  'home.trust_secure_desc': 'Propulsé par Stripe',
  'home.trust_quality_title': 'PDF de qualité',
  'home.trust_quality_desc': 'Documents professionnels',
  'home.trust_worldwide_title': 'Monde entier',
  'home.trust_worldwide_desc': '190+ pays',
  'home.browse_title': 'Parcourir par catégorie',
  'home.browse_subtitle': 'Trouvez la documentation dont vous avez besoin',
  'home.view_all': 'Tout voir →',
  'home.featured_title': 'Manuels mis en avant',
  'home.recent_title': 'Récemment ajoutés',
  'home.seo_title': 'Votre source de documentation technique professionnelle',
  'home.seo_p1':
    "Service Manuels Pro est une place de marché dédiée à la documentation technique professionnelle. Nous proposons manuels de service, guides de réparation, schémas électroniques et mécaniques et plans de câblage pour une large gamme d'équipements et de dispositifs.",
  'home.seo_p2':
    "Que vous soyez technicien professionnel, propriétaire d'atelier de réparation ou passionné restaurant du matériel ancien, notre bibliothèque de documentation technique vous aidera à mener à bien vos travaux. Des manuels de réparation d'appareils photo anciens, d'équipements audio et de télécommunications, de dispositifs biomédicaux, aux manuels d'atelier automobiles et guides de machines-outils, nous recherchons la documentation dont vous avez besoin.",
  'home.seo_p3':
    "Tous les documents sont disponibles en téléchargement PDF immédiat après paiement sécurisé via Stripe. Aucun abonnement requis — payez une fois et téléchargez immédiatement.",
  'home.search_results_for': 'Résultats de recherche pour',
  'home.documents_found': 'documents trouvés',
  'home.document_found': 'document trouvé',
  'home.no_results': 'Aucun document trouvé. Essayez d\'autres mots-clés.',

  // ─── DocCard / Categories ───────────────────────────────────
  'doc.featured_badge': 'Mis en avant',
  'doc.pdf_document': 'Document PDF',
  'doc.manuals': 'manuels',
  'doc.manual': 'manuel',
  'doc.brands': 'marques',
  'doc.brand': 'marque',

  // ─── Document page ──────────────────────────────────────────
  'docpage.by': 'par',
  'docpage.buy_now': 'Acheter',
  'docpage.instant_download': 'Téléchargement PDF immédiat après paiement',
  'docpage.link_valid_24h': 'Lien de téléchargement valide 24 heures',
  'docpage.stripe_secure': 'Paiement sécurisé via Stripe',
  'docpage.details': 'Détails du document',
  'docpage.format': 'Format',
  'docpage.pages': 'Pages',
  'docpage.size': 'Taille',
  'docpage.language': 'Langue',
  'docpage.category': 'Catégorie',
  'docpage.related': 'Documents associés',
  'docpage.email_placeholder': 'Votre adresse email',
  'docpage.email_invalid': 'Veuillez saisir une adresse email valide.',
  'docpage.generic_error': "Une erreur s'est produite. Veuillez réessayer.",
  'docpage.pay': 'Payer',
  'docpage.buy_now_prefix': 'Acheter —',

  // ─── Download notice ────────────────────────────────────────
  'notice.computer_required': 'La documentation doit être téléchargée sur un ordinateur',
  'notice.computer_details': '(PC, Mac ou Linux).',
  'notice.no_mobile':
    "N'utilisez pas de smartphone ou de tablette pour télécharger la documentation ; ces appareils manquent généralement de mémoire pour gérer les fichiers volumineux, et peu d'utilisateurs savent retrouver le dossier de téléchargement sur ces appareils.",
  'notice.translate':
    "Une fois téléchargée, vous pouvez l'utiliser immédiatement et même imprimer les pages souhaitées, ou utiliser votre smartphone en mode photo pour la traduire dans la langue de votre choix :",
  'notice.google_translate': 'Google Traduction',

  // ─── Categories list page ───────────────────────────────────
  'categories.title': 'Toutes les catégories',
  'categories.subtitle': 'Parcourez notre bibliothèque complète de documentation',

  // ─── Category detail page ───────────────────────────────────
  'category.brands': 'Marques',
  'category.documents': 'Documents',
  'category.all_brands': 'Toutes les marques',
  'category.filter_by_brand': 'Filtrer par marque',
  'category.home': 'Accueil',
  'category.categories': 'Catégories',
  'category.service_manuals_suffix': 'Manuels de service',
  'category.browse_by_brand': 'Parcourir par marque',
  'category.all_prefix': 'Tous les manuels',
  'category.all_suffix': '',
  'category.meta_title_suffix': 'Manuels de service | Guides de réparation & schémas',
  'category.meta_description_fallback': 'Téléchargez des manuels de service professionnels. Guides de réparation, schémas et documentation technique.',
  'category.brand_filter_title': 'Marque',
  'category.back_to_category': 'Retour à la catégorie',
  'category.brand_subtitle_suffix': 'disponibles au téléchargement',
  'category.no_manuals_for': 'Aucun manuel disponible pour le moment pour',

  // ─── About ──────────────────────────────────────────────────
  'about.title': 'À propos',
  'about.right_to_repair_heading_prefix': 'Le',
  'about.right_to_repair_link': 'droit à la réparation',
  'about.intro': 'Trouvez la documentation dont vous avez besoin sur ce site !',
  'about.search_text': "Trouvez un manuel d'utilisation, une notice, un manuel de service ou toute documentation technique, quelle que soit la marque.",
  'about.archive_text': "Vous pouvez archiver vos manuels d'utilisation et notices (ou vos manuels d'atelier) pour les consulter plus tard et assurer l'entretien ou la réparation de votre matériel.",
  'about.search_hint_prefix': 'Saisissez votre recherche dans le champ',
  'about.search_hint_field': 'Rechercher un manuel...',
  'about.search_hint_suffix': 'en haut de la page.',
  'about.deep_web_text': "Si vous ne trouvez pas la documentation que vous cherchez sur ce site, nous pouvons la rechercher pour vous sur l'immensité d'Internet et même dans le Deep Web, sans frais de recherche supplémentaires.",
  'about.contact_prefix': "N'hésitez pas à",
  'about.contact_link': 'nous contacter',
  'about.meta_title': 'À propos | Service Manuels Pro',
  'about.meta_description': 'Service Manuels Pro soutient le droit à la réparation. Trouvez manuels utilisateur, manuels de service, schémas et documentation technique pour toutes les marques.',

  // ─── Contact ────────────────────────────────────────────────
  'contact.title': 'Contact',
  'contact.name': 'Nom',
  'contact.email': 'Email',
  'contact.subject': 'Sujet',
  'contact.message': 'Message',
  'contact.send': 'Envoyer le message',
  'contact.success': 'Votre message a bien été envoyé. Nous vous répondrons dans les meilleurs délais.',
  'contact.error': "Une erreur s'est produite. Veuillez réessayer.",
  'contact.intro': "Une question ? Besoin d'aide pour trouver un manuel ? Envoyez-nous un message.",
  'contact.meta_title': 'Contact | Service Manuels Pro',
  'contact.meta_description': "Contactez Service Manuels Pro pour toute question concernant notre documentation technique, les demandes de recherche personnalisées ou le support.",
  'contact.page_subtitle': "Nous sommes là pour vous aider. N'hésitez pas à nous contacter.",
  'contact.email_card_title': 'Email',
  'contact.email_card_text': 'Envoyez-nous un email et nous vous répondrons dans les meilleurs délais.',
  'contact.response_card_title': 'Délai de réponse',
  'contact.response_card_text_prefix': 'Nous répondons généralement sous',
  'contact.response_card_text_time': '72 heures',
  'contact.response_card_text_suffix': 'les jours ouvrés.',
  'contact.company_title': "Informations sur l'entreprise",
  'contact.company_name_1': 'LA DOCUMENTATION TECHNIQUE',
  'contact.company_name_2': 'SHOP OF TECHNICAL DOCUMENTATIONS',
  'contact.company_register_label': 'Registre du commerce de Zvolen :',
  'contact.for_inquiry_prefix': 'Pour toute demande, contactez-nous à',
  'contact.how_help_title': 'Comment pouvons-nous vous aider ?',
  'contact.help_research_title': 'Recherche de documentation personnalisée',
  'contact.help_research_text': "Vous ne trouvez pas le manuel recherché ? Nous pouvons le chercher pour vous sur Internet et même sur le Deep Web, sans frais de recherche supplémentaires.",
  'contact.help_order_title': 'Support commande',
  'contact.help_order_text': "Questions concernant un achat, un lien de téléchargement ou un paiement ? Nous sommes là pour vous aider.",
  'contact.help_general_title': 'Demandes générales',
  'contact.help_general_text': "Toute autre question ou suggestion ? Nous serions ravis de vous lire.",
  'contact.send_email_button': 'Envoyez-nous un email',

  // ─── Terms ──────────────────────────────────────────────────
  'terms.title': 'Conditions générales de vente',

  // ─── Privacy ────────────────────────────────────────────────
  'privacy.title': 'Politique de confidentialité',

  // ─── Download pages ─────────────────────────────────────────
  'download.success_title': 'Paiement réussi',
  'download.success_message':
    'Votre paiement a été reçu. Un lien de téléchargement a été envoyé à votre adresse email.',
  'download.back_home': "Retour à l'accueil",
  'download.expired': 'Ce lien de téléchargement a expiré.',
  'download.link_title': 'Votre téléchargement',
  'download.click_to_download': 'Cliquer pour télécharger',
  'download.success_heading': 'Paiement réussi !',
  'download.success_subtitle': 'Merci pour votre achat. Votre lien de téléchargement est en route.',
  'download.check_email_title': 'Vérifiez votre email',
  'download.check_email_text': 'Nous avons envoyé un lien de téléchargement à votre adresse email. Vérifiez votre boîte de réception (et vos spams).',
  'download.link_24h_title': 'Lien valide 24 heures',
  'download.link_24h_text': 'Votre lien de téléchargement expire dans 24 heures. Vous pouvez télécharger le fichier jusqu\u2019à 3 fois.',
  'download.need_help_title': "Besoin d'aide ?",
  'download.need_help_text': "Si vous ne recevez pas l'email dans quelques minutes, contactez-nous.",
  'download.back_homepage': "← Retour à l'accueil",
  'download.invalid_title': 'Lien de téléchargement invalide',
  'download.invalid_text': "Ce lien de téléchargement n'est pas valide. Veuillez vérifier votre email pour obtenir le bon lien.",
  'download.expired_title': 'Lien de téléchargement expiré',
  'download.expired_text': 'Ce lien de téléchargement a expiré. Veuillez contacter le support.',
  'download.limit_title': 'Limite de téléchargements atteinte',
  'download.limit_text': 'Vous avez atteint le nombre maximum de téléchargements (3). Contactez le support si vous avez besoin d\u2019un accès supplémentaire.',
  'download.files_ready': 'Vos fichiers sont prêts',
  'download.bundle_contains_prefix': 'Ce pack contient',
  'download.bundle_contains_suffix': 'fichiers. Cliquez sur chaque bouton pour télécharger.',
  'download.remaining_prefix': 'Vous pouvez accéder à cette page encore',
  'download.remaining_more_time': 'fois',
  'download.remaining_more_times': 'fois',
  'download.last_access': "C'était votre dernier accès à cette page de téléchargement.",
  'download.meta_success': 'Paiement réussi',
  'download.meta_token': 'Téléchargez votre manuel',

  // ─── Search ─────────────────────────────────────────────────
  'search.placeholder': 'Rechercher une documentation...',
  'search.button': 'Rechercher',

  // ─── Metadata (SEO) ─────────────────────────────────────────
  'meta.default_title': 'Service Manuels Pro | Téléchargement de documentation technique professionnelle',
  'meta.default_description':
    "La plus grande collection mondiale de manuels de service professionnels, guides de réparation, schémas et plans de câblage. Téléchargement PDF immédiat pour appareils photo, audio, automobile, électronique et plus encore.",
  'meta.og_title': 'Service Manuels Pro | Documentation technique professionnelle',
  'meta.og_description':
    "Téléchargez des manuels de service, guides de réparation et schémas professionnels. Livraison PDF immédiate.",
  'meta.twitter_description': 'Documentation technique professionnelle à télécharger immédiatement.',
};

export type MessageKey = keyof typeof en;

export const messages: Record<Locale, Record<MessageKey, string>> = {
  en,
  fr,
};

/**
 * Traduit une clé pour un locale donné explicitement.
 * Utilisable dans les Client Components (pas de dépendance à headers()).
 */
export function tr(locale: Locale, key: MessageKey): string {
  return messages[locale][key] ?? messages.en[key] ?? key;
}

// Traductions des noms de catégories (slug → nom FR)
const categoryNamesFr: Record<string, string> = {
  'pet-care': 'Animaux & Soins',
  'automotive': 'Automobile',
  'biomedical': 'Biomédical',
  'machine-tools': 'Machines-Outils',
  'camping-rv': 'Camping & Camping-Cars',
  'cinema-video': 'Cinéma & Vidéo',
  'drones': 'Drones',
  'home-appliances': 'Électroménager',
  'electronics': 'Électronique',
  'computers-it': 'Informatique',
  'outdoor-power': 'Motoculture',
  'marine': 'Marine',
  'photography': 'Photographie',
  'radio-communications': 'Radio & Communications',
  'audio-hifi': 'Audio & HiFi',
  'sports-equipment': 'Équipements Sportifs',
  'phones-telecom': 'Téléphonie & Télécom',
  'television': 'Télévision',
  'machining': 'Usinage',
};

const categoryDescriptionsFr: Record<string, string> = {
  'pet-care': "Manuels de service pour équipements et accessoires de soins animaliers",
  'automotive': "Manuels d'atelier, guides de réparation et schémas pour voitures, motos et véhicules",
  'biomedical': "Manuels techniques pour équipements biomédicaux et dentaires",
  'machine-tools': "Manuels de service pour machines-outils (tours, fraiseuses), machines à bois et équipements de couture",
  'camping-rv': "Documentation technique pour caravanes, camping-cars et équipements de camping",
  'cinema-video': "Manuels de service pour projecteurs, caméras vidéo et équipements cinématographiques",
  'drones': "Manuels techniques et guides de réparation pour drones grand public et professionnels",
  'home-appliances': "Manuels de service pour appareils électroménagers, chauffages et équipements domestiques",
  'electronics': "Manuels techniques pour instruments de mesure, oscilloscopes et équipements électroniques",
  'computers-it': "Manuels de service et guides techniques pour ordinateurs et équipements informatiques",
  'outdoor-power': "Manuels de service pour tronçonneuses, tondeuses et équipements de motoculture",
  'marine': "Manuels techniques pour moteurs marins, systèmes embarqués et équipements nautiques",
  'photography': "Manuels de service pour appareils photo, objectifs, flashs et équipements photographiques",
  'radio-communications': "Manuels de service pour radios, émetteurs-récepteurs, CB et radioamateur",
  'audio-hifi': "Manuels de service pour amplificateurs, magnétophones, platines et équipements audio",
  'sports-equipment': "Manuels techniques pour équipements et machines de sport",
  'phones-telecom': "Manuels de service pour smartphones, téléphones mobiles et équipements télécom",
  'television': "Manuels de service pour téléviseurs, moniteurs, alimentations et écrans",
  'machining': "Guides techniques pour tours, fraiseuses et équipements de travail des métaux",
};

export function getCategoryName(slug: string, name: string, locale: Locale): string {
  if (locale === 'fr') return categoryNamesFr[slug] ?? name;
  return name;
}

export function getCategoryDescription(slug: string, description: string, locale: Locale): string {
  if (locale === 'fr') return categoryDescriptionsFr[slug] ?? description;
  return description;
}
