// lib/fcmServer.js
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export async function sendFcmNotification(tokens, title, body, data = {}) {
  if (!tokens.length) return;

  try {
    const messaging = admin.messaging();
    const message = {
      notification: { title, body },
      data,
      tokens,
    };

    // ✅ Updated method
    const res = await messaging.sendEachForMulticast(message);

    console.log(`FCM sent: ${res.successCount} success, ${res.failureCount} fail`);
  } catch (err) {
    console.error("FCM send error", err);
  }
}
