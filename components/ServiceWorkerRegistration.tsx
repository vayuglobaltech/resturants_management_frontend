'use client';

import { useEffect, useState } from 'react';

export default function ServiceWorkerRegistration() {
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    // ✅ Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.log('⚠️ Service Worker not supported');
      return;
    }

    // ✅ For development: check if we want to enable PWA
    // You can add a query param: ?pwa=true
    const isDev = process.env.NODE_ENV === 'development';
    const isPwaTest = typeof window !== 'undefined' && 
                      window.location.search.includes('pwa=true');
    
    if (isDev && !isPwaTest) {
      console.log('ℹ️ Service Worker disabled in development. Add ?pwa=true to test PWA.');
      return;
    }

    // ✅ Register the service worker
    navigator.serviceWorker
      .register('/sw.js', { 
        scope: '/', 
        updateViaCache: 'none' 
      })
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope);
        setIsRegistered(true);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🔄 New version available!');
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });

    // ✅ Handle updates
    navigator.serviceWorker.ready.then((registration) => {
      registration.update();
    });

    return () => {
      // Cleanup if needed
    };
  }, []);

  return null;
}