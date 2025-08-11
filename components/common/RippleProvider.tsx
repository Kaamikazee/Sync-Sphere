/* eslint-disable @typescript-eslint/no-explicit-any */
// components/RippleProvider.tsx
"use client";

import { useEffect } from "react";

export default function RippleProvider() {
  useEffect(() => {
    const pointerHandler = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const el = target.closest("[data-ripple]") as HTMLElement | null;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const duration = Number(el.dataset.rippleDuration ?? 600);
      const color = el.dataset.rippleColor ?? "rgba(255,255,255,0.25)";

      // size large enough to cover element
      const size = Math.max(rect.width, rect.height) * 2;
      const clientX = (e as any).clientX ?? rect.left + rect.width / 2;
      const clientY = (e as any).clientY ?? rect.top + rect.height / 2;
      const x = clientX - rect.left - size / 2;
      const y = clientY - rect.top - size / 2;

      // ensure the element can contain absolute children
      const style = getComputedStyle(el);
      if (style.position === "static") el.style.position = "relative";
      if (style.overflow !== "hidden") el.style.overflow = "hidden";

      const span = document.createElement("span");
      span.className = "ripple-span";
      span.style.left = `${x}px`;
      span.style.top = `${y}px`;
      span.style.width = `${size}px`;
      span.style.height = `${size}px`;
      span.style.background = color;
      // animate with transition for predictable removal
      span.style.transition = `transform ${duration}ms linear, opacity ${duration}ms linear`;
      span.style.transform = "scale(0)";
      span.style.opacity = "1";

      el.appendChild(span);

      // trigger animation on next frame
      requestAnimationFrame(() => {
        span.style.transform = "scale(1)";
        span.style.opacity = "0";
      });

      // cleanup after animation
      setTimeout(() => {
        span.remove();
      }, duration + 50);
    };

    // keyboard support (Enter/Space)
    const keyHandler = (ke: KeyboardEvent) => {
      if (ke.key !== "Enter" && ke.key !== " ") return;
      const active = document.activeElement as HTMLElement | null;
      if (!active) return;
      const el = active.closest("[data-ripple]") as HTMLElement | null;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // synthesize a centered event
      const fake = {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        target: el,
      } as unknown as PointerEvent;
      pointerHandler(fake);
    };

    document.addEventListener("pointerdown", pointerHandler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("pointerdown", pointerHandler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, []);

  return null;
}
