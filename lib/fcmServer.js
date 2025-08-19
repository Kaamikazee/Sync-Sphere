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

/**
 * sendFcmNotification
 * - tokens: string[] (recipient FCM tokens)
 * - title: string
 * - body: string
 * - data: object (must be string values for FCM)
 */
export async function sendFcmNotification(tokens, title, body, data = {}) {
  if (!tokens?.length) {
    console.log("sendFcmNotification: no tokens provided");
    return null;
  }

  const messaging = admin.messaging();

  const message = {
    tokens,
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)]) // 🔑 FCM requires string values
    ),
    android: {
      notification: {
        channelId: "default",
        sound: "default",
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
        },
      },
    },
  };

  try {
    const res = await messaging.sendEachForMulticast(message);
    console.log(
      `FCM sent: ${res.successCount} success, ${res.failureCount} fail`
    );
    return res; // 🔑 return result so notifyGroupParticipants can clean invalid tokens
  } catch (err) {
    console.error("sendFcmNotification error", err);
    return null;
  }
}
