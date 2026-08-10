import { messaging, getToken, onMessage } from './firebase';

export async function requestNotificationPermission() {
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Register the service worker and wait for it to be active
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!,
        serviceWorkerRegistration: registration,
      });
      console.log('FCM Token:', token);
      return token;
    }
  } catch (error) {
    console.error('Error requesting permission:', error);
  }
  return null;
}

export async function saveTokenToBackend(token: string) {
  const accessToken = localStorage.getItem('access_token');
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/devices/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ registration_id: token, type: 'web' }),
  });
  if (!response.ok) throw new Error('Failed to save token');
  console.log('Token saved');
}

export function setupForegroundMessageListener(callback: (payload: any) => void) {
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}