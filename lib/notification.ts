import { messaging, getToken, onMessage } from "./firebase";

export async function requestNotificationPermission() {
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!,
      });
      console.log("FCM Token:", token);
      return token;
    }
  } catch (error) {
    console.error("Error requesting permission:", error);
  }
  return null;
}

export async function saveTokenToBackend(token: string) {
  const accessToken = localStorage.getItem("access_token"); // Adjust to your auth storage
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/save-fcm-token/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ token, device_type: "web" }),
  });
  if (!response.ok) {
    throw new Error("Failed to save token");
  }
  console.log("Token saved to backend");
}

// Callback for foreground messages (when app is open)
export function setupForegroundMessageListener(callback: (payload: any) => void) {
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    console.log("Foreground message received:", payload);
    callback(payload);
  });
}