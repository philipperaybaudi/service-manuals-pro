import Link from '@/components/ExternalLink';
import { FileText, Shield } from 'lucide-react';
import { tr, type Locale, SITE_NAMES } from '@/lib/i18n';

const footerCategories = [
  { slug: 'photography',  en: 'Photography',    fr: 'Photographie' },
  { slug: 'automotive',   en: 'Automotive',     fr: 'Automobile' },
  { slug: 'audio-hifi',   en: 'Audio & HiFi',   fr: 'Audio & HiFi' },
  { slug: 'workshop-diy', en: 'Workshop & DIY', fr: 'Atelier & Bricolage' },
  { slug: 'electronics',  en: 'Electronics',    fr: 'Électronique' },
  { slug: 'television',   en: 'Television',     fr: 'Télévision' },
  { slug: 'outdoor-power',en: 'Outdoor Power',  fr: 'Motoculture' },
  { slug: 'marine',       en: 'Marine',         fr: 'Marine' },
  { slug: 'computers-it', en: 'Computers & IT', fr: 'Informatique' },
];

const popularBrands = [
  'Nikon', 'Canon', 'Leica', 'Hasselblad', 'Mamiya', 'Rollei',
  'Sony', 'Panasonic', 'JVC', 'Pioneer', 'Marantz', 'Revox',
  'Stihl', 'Husqvarna', 'Honda', 'Yamaha', 'Suzuki', 'Kawasaki',
  'Tektronix', 'HP', 'Fluke', 'Agilent', 'Bosch', 'Makita',
];

export default function Footer({ locale = 'en' }: { locale?: Locale }) {
  const siteName = SITE_NAMES[locale];
  return (
    <footer className="bg-emerald-950 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <FileText className="h-7 w-7 text-emerald-400" />
              <span className="text-lg font-bold text-white">{siteName}</span>
            </Link>
            <p className="text-sm text-emerald-200/60 max-w-md mb-4">
              {tr(locale, 'footer.tagline')}
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-200/50">
              <Shield className="h-4 w-4" />
              <span>{tr(locale, 'footer.stripe_note')}</span>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              {tr(locale, 'footer.categories')}
            </h3>
            <ul className="space-y-2">
              {footerCategories.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/categories/${cat.slug}`}
                    className="text-sm text-emerald-200/60 hover:text-white transition-colors"
                  >
                    {locale === 'fr' ? cat.fr : cat.en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular Brands */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              {tr(locale, 'footer.popular_brands')}
            </h3>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {popularBrands.map((brand) => (
                <span key={brand} className="text-xs text-emerald-200/50 hover:text-white transition-colors">
                  {brand}
                </span>
              ))}
            </div>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              {tr(locale, 'footer.information')}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm text-emerald-200/60 hover:text-white transition-colors">
                  {tr(locale, 'footer.about')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-emerald-200/60 hover:text-white transition-colors">
                  {tr(locale, 'footer.contact')}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-emerald-200/60 hover:text-white transition-colors">
                  {tr(locale, 'footer.terms')}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-emerald-200/60 hover:text-white transition-colors">
                  {tr(locale, 'footer.privacy')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-emerald-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-emerald-200/40">
            &copy; {new Date().getFullYear()} {siteName}. {tr(locale, 'footer.rights')}
          </p>
          <p className="text-xs text-emerald-200/30">
            {tr(locale, 'footer.right_to_repair')}
          </p>
        </div>
      </div>
    </footer>
  );
}
