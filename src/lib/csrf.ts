import "server-only";

import { headers } from "next/headers";

function allowedOrigins(forwardedHost: string | null, forwardedProto: string | null) {
  const origins = new Set<string>();
  if (process.env.APP_ORIGIN) origins.add(new URL(process.env.APP_ORIGIN).origin);
  if (forwardedHost) origins.add(`${forwardedProto ?? (process.env.NODE_ENV === "production" ? "https" : "http")}://${forwardedHost}`);
  return origins;
}

export async function assertSameOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto");
  if (!origin || !allowedOrigins(host, proto).has(new URL(origin).origin)) throw new Error("İstek kaynağı doğrulanamadı.");
}

export function assertRequestSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto");
  if (!origin || !allowedOrigins(host, proto).has(new URL(origin).origin)) throw new Error("İstek kaynağı doğrulanamadı.");
}
