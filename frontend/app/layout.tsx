import type { Metadata } from 'next';
import Image from 'next/image';
import './globals.css';
import { auth, signOut } from '@/auth';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Moodle Admin Portal',
  description: 'Search and manage Moodle users',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-gray-50 text-gray-900 antialiased">
        <Providers session={session}>
          <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">M</span>
            </div>
            <span className="font-semibold text-lg text-gray-900">Moodle Admin Portal</span>

            {session?.user && (
              <div className="ml-auto flex items-center gap-3">
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name ?? 'User avatar'}
                    width={32}
                    height={32}
                    className="rounded-full"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                    {session.user.name?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                )}
                <span className="hidden text-sm text-gray-700 sm:block">
                  {session.user.name}
                </span>
                <form
                  action={async () => {
                    'use server';
                    await signOut({ redirectTo: '/login' });
                  }}
                >
                  <button
                    type="submit"
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </header>
          <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
