'use client';

import { useState } from 'react';
import { flushCache } from '@/lib/api';

interface Props {
  cached: boolean;
  cachedAt: string;
  scope: string;
  onFlushed: () => void;
}

function timeAgo(iso: string): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff === 1) return '1 minute ago';
  return `${diff} minutes ago`;
}

export default function CacheStatus({ cached, cachedAt, scope, onFlushed }: Props) {
  const [flushing, setFlushing] = useState(false);

  async function handleFlush() {
    setFlushing(true);
    try {
      await flushCache(scope);
      onFlushed();
    } finally {
      setFlushing(false);
    }
  }

  const label = cached
    ? `Data cached ${timeAgo(cachedAt)}`
    : `Fetched ${timeAgo(cachedAt)}`;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${cached ? 'bg-blue-400' : 'bg-emerald-400'}`}
      />
      <span>{label}</span>
      <button
        onClick={handleFlush}
        disabled={flushing}
        className="ml-auto flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2 py-1 text-xs transition-colors hover:bg-slate-100 disabled:opacity-50"
      >
        {flushing ? (
          <>
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
            Refreshing…
          </>
        ) : (
          '↺ Refresh'
        )}
      </button>
    </div>
  );
}
