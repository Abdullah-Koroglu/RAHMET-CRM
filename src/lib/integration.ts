import { createHash } from "node:crypto";
import { Prisma, type ExternalRegistrationSource } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";

export const incomingRegistrationSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  sourceRecordId: z.string().min(1).max(200),
  sourceSubmittedAt: z.string().datetime().nullable().optional(),
  sourceRowNumber: z.number().int().positive().optional(),
  validationErrors: z.array(z.string().max(80)).max(20).optional(),
  fields: z.object({
    fullName: z.string().trim().min(1).max(200),
    phoneRaw: z.string().trim().max(50),
    birthDate: z.string().date().nullable().optional(),
    district: z.string().max(100).nullable().optional(),
    previousParticipant: z.boolean().nullable().optional(),
    previousCourse: z.string().max(200).nullable().optional(),
    maritalStatus: z.string().max(30).nullable().optional(),
    childrenCount: z.number().int().nonnegative().nullable().optional(),
    educationLevel: z.string().max(100).nullable().optional(),
    discoveryChannel: z.string().max(150).nullable().optional(),
    sourceCourseLabel: z.string().max(150).nullable().optional(),
  }).strict(),
}).strict();

export type IncomingRegistration = z.infer<typeof incomingRegistrationSchema>;

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+90${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+90${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("90")) return `+${digits}`;
  return null;
}

export async function ingestRegistration(
  source: ExternalRegistrationSource,
  input: IncomingRegistration,
  options: { legacySourceRecordId?: string } = {},
) {
  const payloadHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const phoneNormalized = normalizePhone(input.fields.phoneRaw);
  const validationErrors = [...(input.validationErrors ?? []), ...(phoneNormalized ? [] : [input.fields.phoneRaw ? "PHONE_INVALID" : "PHONE_MISSING"])];
  const eventKey = `delivery:${source.id}:${input.sourceRecordId}`;
  const event = await db.integrationEvent.upsert({
    where: { eventKey },
    update: { attemptCount: { increment: 1 }, status: "RECEIVED", lastErrorCode: null },
    create: { eventKey, eventType: "REGISTRATION", externalSourceId: source.id, sourceRecordId: input.sourceRecordId, payloadHash, status: "RECEIVED" },
  });

  try {
    return await db.$transaction(async (tx) => {
      let existing = await tx.preRegistration.findUnique({
        where: { externalSourceId_sourceRecordId: { externalSourceId: source.id, sourceRecordId: input.sourceRecordId } },
      });
      if (!existing && options.legacySourceRecordId) {
        const legacy = await tx.preRegistration.findUnique({ where: { externalSourceId_sourceRecordId: { externalSourceId: source.id, sourceRecordId: options.legacySourceRecordId } } });
        const sameSubmission = legacy && legacy.fullName.localeCompare(input.fields.fullName, "tr", { sensitivity: "base" }) === 0 && (legacy.phoneNormalized ?? normalizePhone(legacy.phoneRaw)) === phoneNormalized;
        if (legacy && sameSubmission) existing = await tx.preRegistration.update({ where: { id: legacy.id }, data: { sourceRecordId: input.sourceRecordId } });
      }
      if (!existing && input.sourceSubmittedAt) {
        existing = await tx.preRegistration.findFirst({ where: { externalSourceId: source.id, fullName: { equals: input.fields.fullName, mode: "insensitive" }, phoneNormalized, sourceSubmittedAt: new Date(input.sourceSubmittedAt) } });
        if (existing && existing.sourceRecordId !== input.sourceRecordId) existing = await tx.preRegistration.update({ where: { id: existing.id }, data: { sourceRecordId: input.sourceRecordId } });
      }
      if (existing) {
        await tx.integrationEvent.update({ where: { eventKey }, data: { status: "PROCESSED", processedAt: new Date() } });
        return { duplicate: true, id: existing.id };
      }
      const created = await tx.preRegistration.create({
        data: {
          externalSourceId: source.id,
          courseId: source.courseId,
          sourceRecordId: input.sourceRecordId,
          sourceSubmittedAt: input.sourceSubmittedAt ? new Date(input.sourceSubmittedAt) : null,
          sourceCourseLabel: input.fields.sourceCourseLabel,
          fullName: input.fields.fullName,
          phoneRaw: input.fields.phoneRaw,
          phoneNormalized,
          birthDate: input.fields.birthDate ? new Date(input.fields.birthDate) : null,
          district: input.fields.district,
          previousParticipant: input.fields.previousParticipant,
          previousCourse: input.fields.previousCourse,
          maritalStatus: input.fields.maritalStatus,
          childrenCount: input.fields.childrenCount,
          educationLevel: input.fields.educationLevel,
          discoveryChannel: input.fields.discoveryChannel,
          validationErrors: validationErrors.length ? validationErrors : Prisma.JsonNull,
        },
      });
      await tx.integrationEvent.update({
        where: { eventKey },
        data: { status: "PROCESSED", processedAt: new Date() },
      });
      await tx.externalRegistrationSource.update({
        where: { id: source.id },
        data: { lastSuccessAt: new Date(), consecutiveFailures: 0 },
      });
      return { duplicate: false, id: created.id };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await db.preRegistration.findUnique({
        where: { externalSourceId_sourceRecordId: { externalSourceId: source.id, sourceRecordId: input.sourceRecordId } },
      });
      await db.integrationEvent.update({ where: { eventKey }, data: { status: "PROCESSED", processedAt: new Date() } });
      return { duplicate: true, id: existing?.id ?? null };
    }
    await db.integrationEvent.update({ where: { eventKey }, data: { status: event.attemptCount >= 5 ? "DEAD_LETTER" : "FAILED", lastErrorCode: error instanceof Error ? error.name.slice(0, 100) : "PROCESSING_ERROR" } });
    throw error;
  }
}
