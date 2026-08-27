import type { Metadata, Viewport } from 'next';
import { SCHOOL } from '../lib';
import './globals.css';

export const metadata: Metadata = {
  title: SCHOOL.name,
  description: SCHOOL.tagline,
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: SCHOOL.shortName,
  },
};

export const viewport: Viewport = {
  themeColor: '#1a472a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}