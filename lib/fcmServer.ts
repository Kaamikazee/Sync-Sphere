// lib/fcmServer.ts
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export async function sendFcmNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
) {
  if (!tokens.length) return;

  try {
    const messaging = admin.messaging();
    const message = {
      notification: { title, body },
      data: data || {},
      tokens,
    };

    // ✅ Updated method
    const res = await messaging.sendEachForMulticast(message);

    console.log(`FCM sent: ${res.successCount} success, ${res.failureCount} fail`);
  } catch (err) {
    console.error("FCM send error", err);
  }
}
