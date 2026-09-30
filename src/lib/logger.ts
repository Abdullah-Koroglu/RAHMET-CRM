import { randomUUID } from "node:crypto";

type Level = "info" | "warn" | "error";
type Fields = Record<string, unknown>;
const SENSITIVE_KEY = /password|secret|token|authorization|cookie|phone|email|name|payload/i;

function sanitize(value: unknown, key = ""): unknown {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((item) => sanitize(item));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, sanitize(child, childKey)]));
  if (typeof value === "string" && value.length > 500) return `${value.slice(0, 500)}…`;
  return value;
}

export function requestId(request?: Request) {
  return request?.headers.get("x-request-id")?.slice(0, 100) || randomUUID();
}

export function log(level: Level, event: string, fields: Fields = {}) {
  const record = { timestamp: new Date().toISOString(), level, event, ...sanitize(fields) as Fields };
  const line = JSON.stringify(record);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export function safeErrorCode(error: unknown) {
  if (error instanceof Error) return error.name.replace(/[^A-Za-z0-9_]/g, "_").slice(0, 80) || "ERROR";
  return "UNKNOWN_ERROR";
}
