import Link from '@/components/ExternalLink';
import { Monitor, Smartphone, Languages } from 'lucide-react';

export default function DownloadNotice() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
      <div className="flex items-start gap-3">
        <Monitor className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-900 leading-relaxed">
          <span className="font-semibold">Documentation must be downloaded on a computer</span> (PC, Mac, or Linux).
        </p>
      </div>
      <div className="flex items-start gap-3">
        <Smartphone className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800 leading-relaxed">
          Do not use a smartphone or tablet to download documentation; they generally lack sufficient memory capacity to handle large files, and few users know how to locate the download folder on these devices.
        </p>
      </div>
      <div className="flex items-start gap-3">
        <Languages className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
        <p className="text-sm text-gray-700 leading-relaxed">
          Once downloaded, you can use it right away and even print the pages you need, or use your smartphone in photo mode to translate into the language of your choice:{' '}
          <Link
            href="https://translate.google.com/intl/gb/about/"
            className="text-emerald-700 hover:text-emerald-800 font-semibold underline underline-offset-2"
          >
            Google Translate
          </Link>
        </p>
      </div>
    </div>
  );
}
