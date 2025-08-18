"use client";

import { useEffect } from "react";
import { requestFcmToken } from "@/lib/firebaseClient";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    async function setup() {
      if (!("serviceWorker" in navigator)) return;

      try {
        await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
        // requestFcmToken is called without args (matches its current signature)
        const token = await requestFcmToken();
        if (token) {
          await fetch("/api/push/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
        }
      } catch (err) {
        console.error("Service worker / token registration failed", err);
      }
    }

    // no mounted boolean needed because we don't set component state here
    setup();
  }, []);

  return null;
}
