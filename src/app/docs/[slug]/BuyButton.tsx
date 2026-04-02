'use client';

import { useState } from 'react';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface BuyButtonProps {
  documentId: string;
  documentTitle: string;
  price: number;
}

export default function BuyButton({ documentId, documentTitle, price }: BuyButtonProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [showEmail, setShowEmail] = useState(false);

  async function handleBuy() {
    if (!showEmail) {
      setShowEmail(true);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      alert('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, email }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {showEmail && (
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          className="w-full px-4 py-3 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          onKeyDown={(e) => e.key === 'Enter' && handleBuy()}
        />
      )}
      <button
        onClick={handleBuy}
        disabled={loading || (showEmail && !email.includes('@'))}
        className="w-full bg-emerald-700 text-white py-3.5 rounded-full font-semibold text-base hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <ShoppingCart className="h-5 w-5" />
            {showEmail ? `Pay ${formatPrice(price)}` : `Buy Now — ${formatPrice(price)}`}
          </>
        )}
      </button>
    </div>
  );
}
