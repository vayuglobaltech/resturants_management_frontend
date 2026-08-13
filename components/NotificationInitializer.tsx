'use client';

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  requestNotificationPermission,
  saveTokenToBackend,
  setupForegroundMessageListener,
} from "@/lib/notification";
import toast from "react-hot-toast"; 

export default function NotificationInitializer() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const initNotifications = async () => {
      try {
        // 1. Register Firebase Messaging service worker
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('✅ FCM SW registered:', registration);
          // Wait for it to be active
          await navigator.serviceWorker.ready;
        }

        // 2. Request permission and get token
        const token = await requestNotificationPermission();
        if (token) {
          await saveTokenToBackend(token);
        }

        // 3. Listen for foreground messages
        const unsubscribe = setupForegroundMessageListener((payload) => {
          // 🔔 Custom toast instead of alert
          toast.success(
            <div>
              <strong>{payload.notification?.title || 'New Notification'}</strong>
              <p className="text-sm text-muted-foreground mt-1">
                {payload.notification?.body || ''}
              </p>
            </div>,
            {
              duration: 5000,
              position: 'bottom-right',
              style: {
                background: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
                borderRadius: '12px',
                padding: '12px 16px',
                maxWidth: '400px',
              },
              icon: '🔔',
            }
          );
        });

        return () => {
          if (unsubscribe) unsubscribe();
        };
      } catch (error) {
        console.error("Notification setup error:", error);
      }
    };

    initNotifications();
  }, [isAuthenticated, user]);

  return null;
}