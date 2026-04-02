'use client';

import { Search } from 'lucide-react';

interface SearchBarProps {
  large?: boolean;
  placeholder?: string;
  defaultValue?: string;
}

export default function SearchBar({ large, placeholder, defaultValue = '' }: SearchBarProps) {
  return (
    <form action="/" method="get" className="w-full">
      <div className="relative">
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 ${large ? 'h-5 w-5' : 'h-4 w-4'}`} />
        <input
          type="text"
          name="q"
          defaultValue={defaultValue}
          placeholder={placeholder || 'Search by brand, model, or keyword...'}
          style={{ color: '#111827' }}
          className={`w-full border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow ${
            large ? 'pl-12 pr-32 py-4 text-lg' : 'pl-10 pr-4 py-2.5 text-sm'
          }`}
        />
        {large && (
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-700 text-white px-6 py-2.5 rounded-full font-medium hover:bg-emerald-800 transition-colors shadow-md"
          >
            Search
          </button>
        )}
      </div>
    </form>
  );
}
