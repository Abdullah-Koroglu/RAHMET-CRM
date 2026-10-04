import { createHash, randomUUID } from "node:crypto";
import { parse } from "csv-parse/sync";
import { db } from "@/lib/db";
import { ingestRegistration, normalizePhone, type IncomingRegistration } from "@/lib/integration";
import { log, safeErrorCode } from "@/lib/logger";

const FULL_SCAN_INTERVAL_MS = 24 * 60 * 60 * 1000;
const BACKSCAN_ROWS = 25;
const MAX_RETRY_ATTEMPTS = 5;

export function parseGoogleSheetUrl(value: string) {
  const url = new URL(value);
  if (url.hostname !== "docs.google.com") throw new Error("Yalnız docs.google.com bağlantıları kabul edilir.");
  const match = url.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
  if (!match || match[1].length > 200) throw new Error("Geçerli bir Google Sheets bağlantısı değil.");
  const gid = url.searchParams.get("gid") ?? url.hash.match(/gid=(\d+)/)?.[1] ?? "0";
  if (!/^\d+$/.test(gid)) throw new Error("Sheet gid değeri geçersiz.");
  return { spreadsheetId: match[1], sheetGid: gid, canonicalUrl: `https://docs.google.com/spreadsheets/d/${match[1]}/edit?gid=${gid}` };
}

const normalizeHeader = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");

const first = (row: Record<string, string>, names: string[]) => {
  const entries = Object.entries(row);
  for (const name of names) {
    const expected = normalizeHeader(name);
    const exact = entries.find(([header, value]) => normalizeHeader(header) === expected && value?.trim());
    if (exact) return exact[1].trim();
  }
  for (const name of names) {
    const expected = normalizeHeader(name);
    const prefixed = entries.find(([header, value]) => normalizeHeader(header).startsWith(`${expected} `) && value?.trim());
    if (prefixed) return prefixed[1].trim();
  }
  return null;
};

function parseDate(value: string | null) {
  if (!value) return null;
  const parts = value.split(/[./]/).map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [day, month, year] = parts;
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) return null;
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function parseTimestamp(value: string | null) {
  if (!value) return null;
  const match = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) return null;
  const [, d, m, y, hh = "00", mm = "00", ss = "00"] = match;
  const result = new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${hh.padStart(2, "0")}:${mm}:${ss}+03:00`);
  return Number.isNaN(result.getTime()) ? null : result.toISOString();
}

function mapRow(row: Record<string, string>, sourceRecordId: string, rowNumber: number): IncomingRegistration {
  const fullName = first(row, ["Adınız ve soyadınız"]);
  const phoneRaw = first(row, ["Telefon numaranız"]) ?? "";
  const previous = first(row, ["Daha önce kurumumuzda başka bir eğitime katıldınız mı?"]);
  const children = first(row, ["Kaç çocuğunuz var?"]);
  const discoveryHeader = Object.keys(row).find((key) => normalizeHeader(key).includes("nasıl haberdar oldunuz"));
  return {
    schemaVersion: 1,
    sourceRecordId,
    sourceRowNumber: rowNumber,
    sourceSubmittedAt: parseTimestamp(first(row, ["Zaman damgası"])),
    validationErrors: fullName ? [] : ["FULL_NAME_MISSING"],
    fields: {
      fullName: fullName ?? "Ad bilgisi eksik",
      phoneRaw,
      birthDate: parseDate(first(row, ["Doğum tarihiniz"])),
      district: first(row, ["Katılım sağlayacağınız ilçe"]),
      previousParticipant: previous ? /^evet$/i.test(previous) : null,
      previousCourse: first(row, ["Katıldıysanız hangi eğitime katıldınız?"]),
      maritalStatus: first(row, ["Medeni haliniz"]),
      childrenCount: children && /^\d+$/.test(children) ? Number(children) : null,
      educationLevel: first(row, ["Mezuniyet durumunuz"]),
      discoveryChannel: discoveryHeader ? first(row, [discoveryHeader]) : null,
      sourceCourseLabel: first(row, ["Column 12"]),
    },
  };
}

function stableRecordId(spreadsheetId: string, sheetGid: string, row: Record<string, string>, input: IncomingRegistration) {
  const responseId = first(row, ["Response ID", "Yanıt Kimliği", "Yanıt kimliği", "Form Response ID"]);
  if (responseId) return `google-response:${responseId}`;
  const normalized = {
    spreadsheetId,
    sheetGid,
    submittedAt: input.sourceSubmittedAt,
    fullName: input.fields.fullName.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim(),
    phone: normalizePhone(input.fields.phoneRaw) ?? input.fields.phoneRaw.replace(/\D/g, ""),
    birthDate: input.fields.birthDate,
    district: input.fields.district?.toLocaleLowerCase("tr-TR") ?? null,
    previousCourse: input.fields.previousCourse?.toLocaleLowerCase("tr-TR") ?? null,
  };
  return `stable-v2:${createHash("sha256").update(JSON.stringify(normalized)).digest("hex")}`;
}

function retryAt(attempt: number) {
  if (attempt >= MAX_RETRY_ATTEMPTS) return null;
  const delay = Math.min(60 * 60 * 1000, 60 * 1000 * 2 ** Math.max(0, attempt - 1));
  return new Date(Date.now() + delay);
}

export async function reconcileSource(sourceId: string, options: { allowInactive?: boolean; forceFull?: boolean } = {}) {
  const source = await db.externalRegistrationSource.findUniqueOrThrow({ where: { id: sourceId } });
  if (source.accessMode === "WEBHOOK_ONLY") throw new Error("WEBHOOK_ONLY_SOURCE");
  const retryDue = source.status === "ERROR" && source.nextRetryAt && source.nextRetryAt <= new Date() && source.retryAttemptCount < MAX_RETRY_ATTEMPTS;
  if (!options.allowInactive && source.status !== "ACTIVE" && !retryDue) throw new Error("SOURCE_NOT_ELIGIBLE");
  const fullScan = options.forceFull || !source.lastFullScanAt || Date.now() - source.lastFullScanAt.getTime() >= FULL_SCAN_INTERVAL_MS;
  const startRow = fullScan ? 2 : Math.max(2, (source.lastSyncedRow ?? 2) - BACKSCAN_ROWS);
  const offset = startRow - 2;
  const query = offset ? `&tq=${encodeURIComponent(`offset ${offset}`)}` : "";
  const url = `https://docs.google.com/spreadsheets/d/${source.spreadsheetId}/gviz/tq?tqx=out:csv&gid=${source.sheetGid}${query}`;
  const syncEventKey = `sync:${source.id}:${randomUUID()}`;
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`GOOGLE_HTTP_${response.status}`);
    const text = await response.text();
    if (text.length > 10 * 1024 * 1024) throw new Error("GOOGLE_RESPONSE_TOO_LARGE");
    const rows = parse(text, { columns: true, skip_empty_lines: true, bom: true, relax_column_count: false }) as Record<string, string>[];
    let processed = 0;
    let duplicates = 0;
    for (let index = 0; index < rows.length; index += 1) {
      const rowNumber = startRow + index;
      const legacySourceRecordId = `${source.spreadsheetId}:${source.sheetGid}:${rowNumber}`;
      const draft = mapRow(rows[index], "pending", rowNumber);
      const input = { ...draft, sourceRecordId: stableRecordId(source.spreadsheetId, source.sheetGid, rows[index], draft) };
      const result = await ingestRegistration(source, input, { legacySourceRecordId });
      if (result.duplicate) duplicates += 1; else processed += 1;
    }
    const scannedThrough = startRow + rows.length - 1;
    await db.$transaction([
      db.externalRegistrationSource.update({
        where: { id: source.id },
        data: { status: "ACTIVE", lastSyncedRow: Math.max(source.lastSyncedRow ?? 1, scannedThrough), syncCursor: String(Math.max(source.lastSyncedRow ?? 1, scannedThrough)), lastSyncAt: new Date(), lastSuccessAt: new Date(), lastErrorCode: null, consecutiveFailures: 0, retryAttemptCount: 0, nextRetryAt: null, lastFullScanAt: fullScan ? new Date() : source.lastFullScanAt, lastIncrementalAt: fullScan ? source.lastIncrementalAt : new Date() },
      }),
      db.integrationEvent.create({ data: { eventKey: syncEventKey, eventType: fullScan ? "FULL_SYNC" : "INCREMENTAL_SYNC", externalSourceId: source.id, status: "PROCESSED", processedAt: new Date() } }),
    ]);
    log("info", "google_forms_reconciled", { sourceId: source.id, fullScan, scanned: rows.length, processed, duplicates });
    return { rows: rows.length, processed, duplicates, fullScan };
  } catch (error) {
    const attempt = source.retryAttemptCount + 1;
    const code = error instanceof Error && /^GOOGLE_[A-Z0-9_]+$/.test(error.message) ? error.message : safeErrorCode(error);
    await db.$transaction([
      db.externalRegistrationSource.update({ where: { id: source.id }, data: { status: "ERROR", lastSyncAt: new Date(), lastErrorCode: code.slice(0, 100), consecutiveFailures: { increment: 1 }, retryAttemptCount: attempt, nextRetryAt: retryAt(attempt) } }),
      db.integrationEvent.create({ data: { eventKey: syncEventKey, eventType: fullScan ? "FULL_SYNC" : "INCREMENTAL_SYNC", externalSourceId: source.id, status: attempt >= MAX_RETRY_ATTEMPTS ? "DEAD_LETTER" : "FAILED", attemptCount: attempt, lastErrorCode: code.slice(0, 100) } }),
    ]);
    log("error", "google_forms_reconcile_failed", { sourceId: source.id, attempt, code });
    throw error;
  }
}
