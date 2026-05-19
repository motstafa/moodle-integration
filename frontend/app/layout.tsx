import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Moodle Admin Portal',
  description: 'Search and manage Moodle users',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-gray-50 text-gray-900 antialiased">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">M</span>
          </div>
          <span className="font-semibold text-lg text-gray-900">Moodle Admin Portal</span>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
