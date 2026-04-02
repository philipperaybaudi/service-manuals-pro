import { Metadata } from 'next';
import { CheckCircle, Mail, Clock, HelpCircle } from 'lucide-react';
import Link from '@/components/ExternalLink';

export const metadata: Metadata = {
  title: 'Payment Successful',
  robots: { index: false, follow: false },
};

export default function DownloadSuccessPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
      <p className="text-gray-500 mb-8">
        Thank you for your purchase. Your download link is on its way.
      </p>

      <div className="bg-white rounded-xl border border-gray-200 p-6 text-left space-y-4 mb-8">
        <div className="flex items-start gap-3">
          <Mail className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-gray-900">Check your email</p>
            <p className="text-sm text-gray-500">
              We&apos;ve sent a download link to your email address. Check your inbox (and spam folder).
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-gray-900">Link valid for 24 hours</p>
            <p className="text-sm text-gray-500">
              Your download link expires in 24 hours. You can download the file up to 3 times.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-gray-900">Need help?</p>
            <p className="text-sm text-gray-500">
              If you don&apos;t receive the email within a few minutes, please contact us.
            </p>
          </div>
        </div>
      </div>

      <Link
        href="/"
        className="text-emerald-700 hover:text-emerald-800 font-medium text-sm"
      >
        &larr; Back to homepage
      </Link>
    </div>
  );
}
