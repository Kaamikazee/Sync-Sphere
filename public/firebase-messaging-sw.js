/* eslint-disable no-undef */
// public/firebase-messaging-sw.js

// Import scripts from Firebase CDN (no bundling needed here)
importScripts("https://www.gstatic.com/firebasejs/11.0.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.0.1/firebase-messaging-compat.js");

// Your Firebase project config (use the *client-side* keys)
firebase.initializeApp({
  apiKey: "AIzaSyB4Qpsb6uP_NP8XqIiVD16-y8mcSYBw55k",
  authDomain: "sync-sphere-4cb41.firebaseapp.com",
  projectId: "sync-sphere-4cb41",
  storageBucket: "sync-sphere-4cb41.firebasestorage.app",
  messagingSenderId: "29476559327",
  appId: "1:29476559327:web:e17c74a049c5755b080c6a",
});

const messaging = firebase.messaging();

// Background push message handler
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Background message:", payload);

  // 🔑 Ensure FCM `data` payloads (strings only) still show notifications
  const notificationTitle =
    payload.notification?.title || payload.data?.title || "New Message";
  const notificationOptions = {
    body:
      payload.notification?.body || payload.data?.body || "You have a new update",
    icon: payload.notification?.icon || "/icons/icon-192x192.png",
    data: payload.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // For example: open chat if groupId/messageId exists in payload
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
