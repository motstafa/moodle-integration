'use client';

import { useState, useEffect, useRef } from 'react';
import SearchBox from '@/components/SearchBox';
import UserResultRow from '@/components/UserResultRow';
import ErrorState from '@/components/ErrorState';
import { searchUsers, ApiError } from '@/lib/api';
import type { SearchUser } from '@/lib/api';

function SearchSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white px-4 py-3"
        >
          <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded bg-slate-200" />
            <div className="h-3 w-1/2 rounded bg-slate-100" />
          </div>
          <div className="h-6 w-16 rounded-full bg-slate-100" />
          <div className="h-7 w-14 rounded-lg bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function classifyError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'MOODLE_UNREACHABLE') {
      return "Couldn't reach the server. Check your connection and try again.";
    }
    return err.message;
  }
  if (err instanceof TypeError) {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  return err instanceof Error ? err.message : 'Search failed.';
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults(null);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await searchUsers(query.trim());
        setResults(resp.data);
      } catch (err) {
        setError(classifyError(err));
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Search</h1>
        <p className="mt-1 text-sm text-slate-500">
          Search Moodle users by name. All requests are proxied securely through the server.
        </p>
      </div>

      <SearchBox query={query} onChange={setQuery} loading={loading} />

      {error && (
        <ErrorState
          message={error}
          onRetry={() => setQuery(q => q.trimEnd() + ' ')}
        />
      )}

      {loading && !error && <SearchSkeleton />}

      {!loading && results !== null && !error && (
        <>
          <p className="text-sm text-slate-500">
            {results.length === 0
              ? 'No users found matching your search.'
              : `${results.length} user${results.length !== 1 ? 's' : ''} found`}
          </p>
          <div className="space-y-2">
            {results.map(user => (
              <UserResultRow key={user.id} user={user} />
            ))}
          </div>
        </>
      )}

      {!loading && results === null && !error && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-8 py-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <svg
              className="h-6 w-6 text-blue-500"
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
          </div>
          <p className="text-sm font-medium text-slate-600">Type a name to search Moodle users</p>
          <p className="mt-1 text-xs text-slate-400">
            Minimum 2 characters — results appear automatically
          </p>
        </div>
      )}
    </div>
  );
}
