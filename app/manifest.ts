import type { MetadataRoute } from 'next';
import { SCHOOL } from '../lib';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SCHOOL.name,
    short_name: SCHOOL.shortName,
    description: SCHOOL.tagline,
    start_url: '/',
    display: 'standalone',
    background_color: '#fafaf8',
    theme_color: '#1a472a',
  };
}