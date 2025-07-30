import { getApp, getApps, initializeApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

// Replace the following with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyB9V2dtfoaAvVwsNt1xljIeyLZTQGarSSg",
  authDomain: "sync-sphere-88a0f.firebaseapp.com",
  projectId: "sync-sphere-88a0f",
  storageBucket: "sync-sphere-88a0f.firebasestorage.app",
  messagingSenderId: "886140043323",
  appId: "1:886140043323:web:c22acc250cfe5697addc1e",
  measurementId: "G-JVDTYXVPWH"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const messaging = async () => {
  const supported = await isSupported();
  return supported ? getMessaging(app) : null;
};

export const fetchToken = async () => {
  try {
    const fcmMessaging = await messaging();
    if (fcmMessaging) {
      const token = await getToken(fcmMessaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_FCM_VAPID_KEY,
      });
      return token;
    }
    return null;
  } catch (err) {
    console.error("An error occurred while fetching the token:", err);
    return null;
  }
};

export { app, messaging };
