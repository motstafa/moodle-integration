'use client';

import { useEffect, useRef } from 'react';

interface Props {
  query: string;
  onChange: (q: string) => void;
  loading: boolean;
}

export default function SearchBox({ query, onChange, loading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
        {loading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        ) : (
          <svg
            className="h-4 w-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        )}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => onChange(e.target.value)}
        placeholder="Search by full name (min. 2 characters)…"
        className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}
