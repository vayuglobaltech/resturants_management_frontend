"use client"; // Required for hooks

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext"; // Adjust to your auth context
import {
  requestNotificationPermission,
  saveTokenToBackend,
  setupForegroundMessageListener,
} from "@/lib/notification";

export default function NotificationInitializer() {
  const { user, isAuthenticated } = useAuth(); // Use your auth state

  useEffect(() => {
    // Only run if user is logged in and we are on the client
    if (!isAuthenticated || !user) return;

    const initNotifications = async () => {
      try {
        // 1. Request permission and get token
        const token = await requestNotificationPermission();
        if (token) {
          // 2. Save token to backend
          await saveTokenToBackend(token);
        }

        // 3. Listen for foreground messages (when app is open)
        const unsubscribe = setupForegroundMessageListener((payload) => {
          // Show a toast or alert when order is ready
          alert(`🔔 ${payload.notification.title}\n${payload.notification.body}`);
          // You can replace this with a toast library (react-hot-toast, etc.)
        });

        // Cleanup listener on unmount
        return () => {
          if (unsubscribe) unsubscribe();
        };
      } catch (error) {
        console.error("Notification setup error:", error);
      }
    };

    initNotifications();
  }, [isAuthenticated, user]);

  return null; // This component does not render anything
}