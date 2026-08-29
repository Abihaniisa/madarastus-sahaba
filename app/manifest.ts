import type { MetadataRoute } from 'next';
import { SCHOOL } from '../lib';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SCHOOL.name,
    short_name: SCHOOL.shortName,
    description: SCHOOL.tagline,
    start_url: '/',
    display: 'standalone',
    background_color: '#fdf9f5',
    theme_color: '#1a472a',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192-maskable.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}