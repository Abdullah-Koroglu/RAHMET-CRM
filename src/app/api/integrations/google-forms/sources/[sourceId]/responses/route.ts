import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { incomingRegistrationSchema, ingestRegistration } from "@/lib/integration";
import { log, requestId, safeErrorCode } from "@/lib/logger";

const MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: Request, context: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await context.params;
  const id = requestId(request);
  const parsedSourceId = z.string().uuid().safeParse(sourceId);
  if (!parsedSourceId.success) return Response.json({ error: "invalid_source", requestId: id }, { status: 400, headers: { "X-Request-ID": id } });
  const source = await db.externalRegistrationSource.findUnique({ where: { id: parsedSourceId.data } });
  if (!source || source.status !== "ACTIVE" || !source.secretReference) return Response.json({ error: "source_unavailable", requestId: id }, { status: 409, headers: { "X-Request-ID": id } });
  const secret = process.env[source.secretReference];
  if (!secret) return Response.json({ error: "secret_not_configured", requestId: id }, { status: 503, headers: { "X-Request-ID": id } });
  const timestamp = request.headers.get("x-rahmet-timestamp") ?? "";
  const signature = request.headers.get("x-rahmet-signature") ?? "";
  const age = Math.abs(Date.now() - Number(timestamp) * 1000);
  if (!timestamp || !Number.isFinite(age) || age > 5 * 60 * 1000) return Response.json({ error: "stale_request", requestId: id }, { status: 401, headers: { "X-Request-ID": id } });
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) return Response.json({ error: "payload_too_large", requestId: id }, { status: 413, headers: { "X-Request-ID": id } });
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) return Response.json({ error: "payload_too_large", requestId: id }, { status: 413, headers: { "X-Request-ID": id } });
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const valid = /^[a-f0-9]{64}$/i.test(signature) && signature.length === expected.length && timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
  if (!valid) return Response.json({ error: "invalid_signature", requestId: id }, { status: 401, headers: { "X-Request-ID": id } });
  let json: unknown;
  try { json = JSON.parse(rawBody); }
  catch { return Response.json({ error: "malformed_json", requestId: id }, { status: 400, headers: { "X-Request-ID": id } }); }
  const parsed = incomingRegistrationSchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "invalid_payload", requestId: id }, { status: 422, headers: { "X-Request-ID": id } });
  try {
    const result = await ingestRegistration(source, parsed.data);
    await db.externalRegistrationSource.update({ where: { id: source.id }, data: { lastWebhookAt: new Date(), lastSuccessAt: new Date() } });
    log("info", "google_forms_webhook_processed", { requestId: id, sourceId: source.id, duplicate: result.duplicate });
    return Response.json({ ...result, requestId: id }, { status: result.duplicate ? 200 : 201, headers: { "X-Request-ID": id } });
  } catch (error) {
    log("error", "google_forms_webhook_failed", { requestId: id, sourceId: source.id, code: safeErrorCode(error) });
    return Response.json({ error: "processing_failed", requestId: id }, { status: 503, headers: { "Retry-After": "60", "X-Request-ID": id } });
  }
}
