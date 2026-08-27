import type { Metadata, Viewport } from 'next';
import { SCHOOL } from '@/lib';

export const metadata: Metadata = {
  title: SCHOOL.name,
  description: SCHOOL.tagline,
  manifest: '/manifest.json',
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
      <head>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
          body {
            font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
            background-color: #fafaf8;
            color: #1e293b;
            line-height: 1.6;
            min-height: 100vh;
            -webkit-font-smoothing: antialiased;
          }
          a { color: inherit; text-decoration: none; }
          img { max-width: 100%; height: auto; display: block; }
          .container { max-width: 768px; margin: 0 auto; padding: 0 16px; }
          @media (min-width: 768px) { .container { max-width: 1024px; padding: 0 24px; } }
          @media (min-width: 1280px) { .container { max-width: 1200px; } }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}