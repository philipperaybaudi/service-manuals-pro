import Link from '@/components/ExternalLink';
import { FileText, Shield } from 'lucide-react';

const footerCategories = [
  { name: 'Photography', slug: 'photography' },
  { name: 'Automotive', slug: 'automotive' },
  { name: 'Audio & HiFi', slug: 'audio-hifi' },
  { name: 'Workshop & DIY', slug: 'workshop-diy' },
  { name: 'Electronics', slug: 'electronics' },
  { name: 'Television', slug: 'television' },
  { name: 'Outdoor Power', slug: 'outdoor-power' },
  { name: 'Marine', slug: 'marine' },
  { name: 'Computers & IT', slug: 'computers-it' },
];

const popularBrands = [
  'Nikon', 'Canon', 'Leica', 'Hasselblad', 'Mamiya', 'Rollei',
  'Sony', 'Panasonic', 'JVC', 'Pioneer', 'Marantz', 'Revox',
  'Stihl', 'Husqvarna', 'Honda', 'Yamaha', 'Suzuki', 'Kawasaki',
  'Tektronix', 'HP', 'Fluke', 'Agilent', 'Bosch', 'Makita',
];

export default function Footer() {
  return (
    <footer className="bg-emerald-950 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <FileText className="h-7 w-7 text-emerald-400" />
              <span className="text-lg font-bold text-white">Service Manuals Pro</span>
            </Link>
            <p className="text-sm text-emerald-200/60 max-w-md mb-4">
              The world&apos;s largest collection of professional technical documentation.
              Service manuals, repair guides, schematics and wiring diagrams.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-200/50">
              <Shield className="h-4 w-4" />
              <span>Secure payments by Stripe</span>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Categories
            </h3>
            <ul className="space-y-2">
              {footerCategories.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/categories/${cat.slug}`}
                    className="text-sm text-emerald-200/60 hover:text-white transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular Brands */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Popular Brands
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
              Information
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm text-emerald-200/60 hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-emerald-200/60 hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-emerald-200/60 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-emerald-200/60 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-emerald-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-emerald-200/40">
            &copy; {new Date().getFullYear()} Service Manuals Pro. All rights reserved.
          </p>
          <p className="text-xs text-emerald-200/30">
            Supporting the Right to Repair movement
          </p>
        </div>
      </div>
    </footer>
  );
}
