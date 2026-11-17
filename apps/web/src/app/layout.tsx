import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AUVRYN — The Intelligent Education Ecosystem',
  description:
    'One institution. One intelligent system. AUVRYN connects students, teachers, parents, administrators and institutions through intelligent operations, automation and AI.',
  icons: {
    icon: [
      { url: '/branding/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: '/branding/app-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-[#F5F7FB]">
      <body className="h-full flex flex-col font-sans antialiased text-[#17243A]">
        {children}
      </body>
    </html>
  );
}
