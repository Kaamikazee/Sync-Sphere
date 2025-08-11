"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function ForceRefreshOnBack() {
  const pathname = usePathname();
  const router = useRouter();
  const lastPath = useRef(pathname);

  useEffect(() => {
    const handlePopState = () => {
      // This will do a server re-fetch instead of using cached data
      router.refresh();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [router]);

  // Update ref when path changes
  useEffect(() => {
    lastPath.current = pathname;
  }, [pathname]);

  return null; // This component renders nothing
}
