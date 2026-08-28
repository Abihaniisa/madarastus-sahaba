import type { Metadata } from 'next';
import { Inter, Lora, Amiri } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
});

const amiri = Amiri({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-amiri',
});

export const metadata: Metadata = {
  title: 'Madrasatus Sahaba — Student Recitation & Attendance System',
  description:
    'A public-facing, installable PWA for recording student recitations and managing academic records.',
  manifest: '/manifest.json',
  themeColor: '#1a3c2a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Madrasatus Sahaba',
  },
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable} ${amiri.variable}`}>
      <body>{children}</body>
    </html>
  );
}