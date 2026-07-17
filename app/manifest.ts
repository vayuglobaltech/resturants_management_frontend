// app/manifest.ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Restaurant Management',
    short_name: 'Restaurant',
    description: 'Restaurant Management System',
    start_url: '/',
    display: 'standalone',
    background_color: '#121110',
    theme_color: '#D4A359',
    orientation: 'portrait',
    scope: '/',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}