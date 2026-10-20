"use client";

import { useEffect } from "react";

/** Registers /sw.js once on mount. Renders nothing -- this is plumbing for
 * the PWA's "Add to Home Screen" / installable behaviour, not UI. */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installable-app support degrading gracefully is fine; no need to
      // surface this to the user.
    });
  }, []);

  return null;
}
