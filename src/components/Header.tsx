'use client';

import Link from '@/components/ExternalLink';
import { useState } from 'react';
import { Search, Menu, X, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/?q=${encodeURIComponent(query.trim())}`);
      setMenuOpen(false);
    }
  }

  return (
    <header className="bg-emerald-900 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <FileText className="h-8 w-8 text-emerald-300" />
            <div>
              <span className="text-xl font-bold text-white">Service Manuals</span>
              <span className="text-xl font-bold text-emerald-300"> Pro</span>
            </div>
          </Link>

          {/* Desktop Search */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search manuals... (e.g. Nikon F3, Stihl MS 250)"
                className="w-full pl-10 pr-4 py-2 bg-emerald-800 border border-emerald-700 rounded-lg text-sm text-white placeholder-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              />
            </div>
          </form>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/categories" className="text-sm text-emerald-200 hover:text-white transition-colors">
              All Categories
            </Link>
            <Link href="/#featured" className="text-sm text-emerald-200 hover:text-white transition-colors">
              Featured
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-emerald-200"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 border-t border-emerald-800 pt-4">
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search manuals..."
                  className="w-full pl-10 pr-4 py-2 bg-emerald-800 border border-emerald-700 rounded-lg text-sm text-white placeholder-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </form>
            <Link
              href="/categories"
              onClick={() => setMenuOpen(false)}
              className="block py-2 text-emerald-200 hover:text-white"
            >
              All Categories
            </Link>
            <Link
              href="/#featured"
              onClick={() => setMenuOpen(false)}
              className="block py-2 text-emerald-200 hover:text-white"
            >
              Featured
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
