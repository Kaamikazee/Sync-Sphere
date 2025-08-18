// components/FcmRegister.tsx
"use client";

import { useEffect } from "react";
import { requestFcmToken } from "@/lib/firebaseClient";

export default function FcmRegister() {
  useEffect(() => {
    let mounted = true;
    requestFcmToken()
      .then(async (token) => {
        if (!mounted) return;
        if (!token) return console.log("No FCM token obtained");
        try {
          await fetch("/api/push/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          console.log("FCM token registered");
        } catch (err) {
          console.error("Failed to register FCM token", err);
        }
      })
      .catch((err) => console.error("requestFcmToken error", err));

    return () => {
      mounted = false;
    };
  }, []);

  // no UI needed
  return null;
}
