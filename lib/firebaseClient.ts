// lib/firebaseClient.ts
import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const messaging = typeof window !== "undefined" ? getMessaging(app) : null;

export async function requestFcmToken(): Promise<string | null> {
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("FCM permission not granted");
      return null;
    }
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });
    console.log("Got FCM token", token);
    return token;
  } catch (err) {
    console.error("FCM token error", err);
    return null;
  }
}

export function onMessageListener() {
  if (!messaging) return () => {};
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log("Foreground push received", payload);
      resolve(payload);
    });
  });
}
