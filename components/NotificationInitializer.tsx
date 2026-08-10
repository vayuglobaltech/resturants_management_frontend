'use client';

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  requestNotificationPermission,
  saveTokenToBackend,
  setupForegroundMessageListener,
} from "@/lib/notification";

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
          alert(`🔔 ${payload.notification.title}\n${payload.notification.body}`);
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