/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/fcmServer.ts
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // NOTE: private key must have real newlines
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

/**
 * Send an FCM push to multiple tokens, log details and optionally call a cleanup callback.
 *
 * - Ensures data values are strings
 * - Adds webpush.fcmOptions.link when data.url is present (helps some browsers)
 * - Splits tokens into batches of up to 500 (multicast limit)
 */
export async function sendFcmNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, any>, // accept any so we coerce below
  opts?: { onBadTokens?: (badTokens: string[]) => Promise<void> | void }
) {
  if (!tokens || tokens.length === 0) {
    console.log("[fcm] no tokens, skipping send");
    return null;
  }

  // sanitize & convert data values to strings (FCM requires string key/values)
  const stringData: Record<string, string> = {};
  if (data) {
    for (const k of Object.keys(data)) {
      try {
        const v = data[k];
        stringData[k] =
          typeof v === "string" ? v : typeof v === "number" || typeof v === "boolean"
            ? String(v)
            : JSON.stringify(v);
      } catch {
        stringData[k] = "";
      }
    }
  }

  // helpful: if url present, also add webpush fcmOptions.link for browsers
  const webpushOptions = stringData.url
    ? {
        fcmOptions: {
          link: stringData.url,
        },
      }
    : undefined;

  const messaging = admin.messaging();

  // chunk tokens since sendEachForMulticast is limited (500 tokens)
  const BATCH = 500;
  const batches: string[][] = [];
  for (let i = 0; i < tokens.length; i += BATCH) {
    batches.push(tokens.slice(i, i + BATCH));
  }

  const allBadTokens = new Set<string>();
  const results: Array<admin.messaging.BatchResponse | null> = [];

  for (const batchTokens of batches) {
    const message: admin.messaging.MulticastMessage = {
      notification: { title, body },
      data: stringData,
      tokens: batchTokens,
      android: {
        priority: "high",
        notification: {
          channelId: "messages",
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
      // add webpush config if available (helps with notifications opened via link)
      ...(webpushOptions ? { webpush: webpushOptions } : {}),
    };

    try {
      const res = await messaging.sendEachForMulticast(message);
      results.push(res);

      console.log(`[fcm] batch ${batchTokens.length} -> ${res.successCount} success, ${res.failureCount} failure`);

      // collect bad tokens for cleanup
      res.responses.forEach((r, idx) => {
        if (!r.success) {
          const token = batchTokens[idx];
          const err = r.error;
          const code =
            (err as any)?.code ||
            (err as any)?.errorInfo?.code ||
            (err as any)?.status ||
            "";
          const msg = (err as any)?.message ?? "";
          // typical reasons we remove token:
          if (
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-registration-token" ||
            String(msg).toLowerCase().includes("notregistered") ||
            String(msg).toLowerCase().includes("invalid-registration-token") ||
            String(msg).toLowerCase().includes("invalid registration token")
          ) {
            allBadTokens.add(token);
          }
          // log the error for diagnostic purposes
          console.warn(`[fcm] token failed idx=${idx}`, token, err);
        }
      });
    } catch (err) {
      console.error("[fcm] sendEachForMulticast error for batch:", err);
      results.push(null);
      // on fatal error for the batch, do not throw — continue to next batch
    }
  }

  const bad = Array.from(allBadTokens);
  if (bad.length && opts?.onBadTokens) {
    try {
      await opts.onBadTokens(bad);
    } catch (cbErr) {
      console.error("[fcm] onBadTokens callback failed:", cbErr);
    }
  }

  return {
    results,
    badTokens: bad,
  };
}
