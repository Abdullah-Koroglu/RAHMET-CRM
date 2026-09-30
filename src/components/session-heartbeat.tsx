"use client";

import { useEffect } from "react";

export function SessionHeartbeat() {
  useEffect(() => {
    const refresh = () => fetch("/api/auth/session", { method: "POST", credentials: "same-origin", headers: { "X-Requested-With": "RAHMET-CRM" } }).catch(() => undefined);
    const id = window.setInterval(refresh, 15 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);
  return null;
}
