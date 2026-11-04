import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Education Management Platform',
  description: 'Unified multi-institution management platform for schools, colleges, and universities.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-slate-50">
      <body className="h-full flex flex-col font-sans antialiased text-slate-900">
        {children}
      </body>
    </html>
  );
}
