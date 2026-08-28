import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Madrasatus Sahaba',
    short_name: 'Madrasa',
    description:
      'Student Recitation & Attendance System for Madrasatus Sahaba Litahfizul Quran',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf8f2',
    theme_color: '#1a3c2a',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };
}