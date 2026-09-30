import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { reconcileSource } from "@/lib/google-forms";
import { log, requestId } from "@/lib/logger";

function equal(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const expected = process.env.CRON_SECRET;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const id = requestId(request);
  if (!expected || !token || !equal(token, expected)) return Response.json({ error: "unauthorized", requestId: id }, { status: 401, headers: { "X-Request-ID": id } });
  const sources = await db.externalRegistrationSource.findMany({ where: { accessMode: "PUBLIC_CSV", OR: [{ status: "ACTIVE" }, { status: "ERROR", nextRetryAt: { lte: new Date() }, retryAttemptCount: { lt: 5 } }] }, select: { id: true } });
  const results = [];
  for (const source of sources) {
    try { results.push({ sourceId: source.id, ok: true, ...(await reconcileSource(source.id)) }); }
    catch { results.push({ sourceId: source.id, ok: false }); }
  }
  const failed = results.some((result) => !result.ok);
  const allFailed = results.length > 0 && results.every((result) => !result.ok);
  log(failed ? "warn" : "info", "reconcile_cron_completed", { requestId: id, sourceCount: results.length, failed: results.filter((result) => !result.ok).length });
  return Response.json({ requestId: id, sources: results }, { status: allFailed ? 503 : failed ? 207 : 200, headers: { "X-Request-ID": id } });
}
