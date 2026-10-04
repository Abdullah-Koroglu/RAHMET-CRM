"use server";

import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  actionError,
  actionSuccess,
  type ActionState,
} from "@/lib/action-state";
import { writeAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { db } from "@/lib/db";
import { parseGoogleSheetUrl, reconcileSource } from "@/lib/google-forms";
import { normalizePhone } from "@/lib/integration";
import { hashPassword } from "@/lib/password";
import { log, safeErrorCode } from "@/lib/logger";
import { monthRange, sessionChargeAmount } from "@/lib/finance";

const id = z.string().uuid();
const requiredText = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);
const money = z
  .string()
  .trim()
  .regex(/^\d{1,9}(?:\.\d{1,2})?$/)
  .transform((value) => new Prisma.Decimal(value));
const formValue = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "");

const academicYearSchema = z
  .object({
    displayName: requiredText(50),
    startDate: z.string().date(),
    endDate: z.string().date(),
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: "Bitiş tarihi başlangıçtan önce olamaz.",
  });

const teacherSchema = z.object({
  firstName: requiredText(100),
  lastName: requiredText(100),
  phone: optionalText(50),
  employmentType: z.enum(["INTERNAL", "EXTERNAL"]),
});

const courseSchema = z.object({
  name: requiredText(150),
  academicYearId: id,
  teacherId: id,
  studentFeeAmount: money,
  monthlySessionCount: z.coerce.number().int().min(1).max(31),
  teacherFeeAmount: money,
});

const manualPreRegistrationSchema = z.object({
  courseId: id,
  fullName: requiredText(200),
  phoneRaw: requiredText(50),
  birthDate: z
    .string()
    .trim()
    .refine((value) => !value || z.string().date().safeParse(value).success, {
      message: "Doğum tarihi geçerli değil.",
    })
    .transform((value) => value || null),
  district: optionalText(100),
});

async function secure<T>(
  roles: ("ADMIN" | "OPERATOR" | "VIEWER")[],
  operation: () => Promise<T>,
) {
  await assertSameOrigin();
  const user = await requireRole(roles);
  return { user, result: await operation() };
}

function invalid() {
  return actionError(
    "Girilen bilgiler geçerli değil veya izin verilen sınırları aşıyor.",
  );
}

async function failed(action: string, error: unknown, message?: string) {
  const requestId = (await headers()).get("x-request-id")?.slice(0, 100);
  log("error", "server_action_failed", {
    action,
    code: safeErrorCode(error),
    requestId,
  });
  return actionError(message);
}

export async function createAcademicYear(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = academicYearSchema.safeParse({
    displayName: formValue(formData, "displayName"),
    startDate: formValue(formData, "startDate"),
    endDate: formValue(formData, "endDate"),
  });
  if (!parsed.success)
    return actionError(parsed.error.issues[0]?.message ?? invalid().message);
  try {
    const { user } = await secure(["ADMIN"], async () => null);
    await db.$transaction(async (tx) => {
      const year = await tx.academicYear.create({
        data: {
          displayName: parsed.data.displayName,
          startDate: new Date(parsed.data.startDate),
          endDate: new Date(parsed.data.endDate),
          status: "ACTIVE",
        },
      });
      await writeAudit(
        tx,
        user.id,
        "ACADEMIC_YEAR_CREATED",
        "AcademicYear",
        year.id,
      );
    });
    revalidatePath("/akademik-yillar");
    return actionSuccess("Akademik yıl oluşturuldu.");
  } catch (error) {
    return failed("createAcademicYear", error);
  }
}

export async function createTeacher(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = teacherSchema.safeParse({
    firstName: formValue(formData, "firstName"),
    lastName: formValue(formData, "lastName"),
    phone: formValue(formData, "phone"),
    employmentType: formValue(formData, "employmentType"),
  });
  if (!parsed.success) return invalid();
  try {
    const { user } = await secure(["ADMIN"], async () => null);
    await db.$transaction(async (tx) => {
      const teacher = await tx.teacher.create({ data: parsed.data });
      await writeAudit(tx, user.id, "TEACHER_CREATED", "Teacher", teacher.id);
    });
    revalidatePath("/ogretmenler");
    return actionSuccess("Öğretmen oluşturuldu.");
  } catch (error) {
    return failed("createTeacher", error);
  }
}

export async function createCourse(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = courseSchema.safeParse({
    name: formValue(formData, "name"),
    academicYearId: formValue(formData, "academicYearId"),
    teacherId: formValue(formData, "teacherId"),
    studentFeeAmount: formValue(formData, "studentFeeAmount"),
    monthlySessionCount: formValue(formData, "monthlySessionCount"),
    teacherFeeAmount: formValue(formData, "teacherFeeAmount"),
  });
  if (!parsed.success) return invalid();
  let courseId: string;
  try {
    const { user } = await secure(["ADMIN"], async () => null);
    courseId = await db.$transaction(async (tx) => {
      const course = await tx.course.create({ data: parsed.data });
      await writeAudit(tx, user.id, "COURSE_CREATED", "Course", course.id);
      return course.id;
    });
  } catch (error) {
    return failed("createCourse", error);
  }
  redirect(`/dersler/${courseId}`);
}

export async function updateCourse(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const requestedId = id.safeParse(formValue(formData, "id"));
  const current = requestedId.success
    ? await db.course.findUnique({
        where: { id: requestedId.data },
        select: { monthlySessionCount: true },
      })
    : null;
  const parsed = courseSchema.extend({ id }).safeParse({
    id: formValue(formData, "id"),
    name: formValue(formData, "name"),
    academicYearId: formValue(formData, "academicYearId"),
    teacherId: formValue(formData, "teacherId"),
    studentFeeAmount: formValue(formData, "studentFeeAmount"),
    monthlySessionCount:
      formValue(formData, "monthlySessionCount") ||
      String(current?.monthlySessionCount ?? ""),
    teacherFeeAmount: formValue(formData, "teacherFeeAmount"),
  });
  if (!parsed.success) return invalid();
  try {
    const { user } = await secure(["ADMIN"], async () => null);
    const { id: courseId, ...data } = parsed.data;
    await db.$transaction(async (tx) => {
      await tx.course.update({ where: { id: courseId }, data });
      await writeAudit(tx, user.id, "COURSE_UPDATED", "Course", courseId);
    });
    revalidatePath(`/dersler/${courseId}`);
    revalidatePath("/dersler");
    return actionSuccess("Ders bilgileri güncellendi.");
  } catch (error) {
    return failed("updateCourse", error);
  }
}

const sourceSchema = z.object({
  courseId: id,
  spreadsheetUrl: z.string().trim().url().max(500),
  accessMode: z.enum(["PUBLIC_CSV", "WEBHOOK_ONLY"]),
});

export async function attachGoogleSource(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsedInput = sourceSchema.safeParse({
    courseId: formValue(formData, "courseId"),
    spreadsheetUrl: formValue(formData, "spreadsheetUrl"),
    accessMode: formValue(formData, "accessMode") || "PUBLIC_CSV",
  });
  if (!parsedInput.success) return invalid();
  try {
    const { user } = await secure(["ADMIN"], async () => null);
    const parsed = parseGoogleSheetUrl(parsedInput.data.spreadsheetUrl);
    const existing = await db.externalRegistrationSource.findUnique({
      where: {
        provider_spreadsheetId_sheetGid: {
          provider: "GOOGLE_FORMS_SHEET",
          spreadsheetId: parsed.spreadsheetId,
          sheetGid: parsed.sheetGid,
        },
      },
    });
    if (existing && existing.courseId !== parsedInput.data.courseId)
      return actionError("Bu Sheet başka bir derse bağlı.");
    const source = existing
      ? await db.externalRegistrationSource.update({
          where: { id: existing.id },
          data: {
            spreadsheetUrl: parsed.canonicalUrl,
            sheetName: "Form Yanıtları 1",
            accessMode: parsedInput.data.accessMode,
            status: "PAUSED",
            lastErrorCode: null,
            nextRetryAt: null,
          },
        })
      : await db.externalRegistrationSource.create({
          data: {
            courseId: parsedInput.data.courseId,
            spreadsheetId: parsed.spreadsheetId,
            spreadsheetUrl: parsed.canonicalUrl,
            sheetGid: parsed.sheetGid,
            sheetName: "Form Yanıtları 1",
            accessMode: parsedInput.data.accessMode,
            status: "PAUSED",
            secretReference: "GOOGLE_FORMS_WEBHOOK_SECRET",
            createdByUserId: user.id,
          },
        });
    if (source.accessMode === "PUBLIC_CSV")
      await reconcileSource(source.id, {
        allowInactive: true,
        forceFull: true,
      });
    await db.$transaction(async (tx) => {
      await tx.externalRegistrationSource.updateMany({
        where: {
          courseId: source.courseId,
          status: "ACTIVE",
          id: { not: source.id },
        },
        data: { status: "ARCHIVED", nextRetryAt: null },
      });
      await tx.externalRegistrationSource.update({
        where: { id: source.id },
        data: { status: "ACTIVE", nextRetryAt: null },
      });
      await writeAudit(
        tx,
        user.id,
        "REGISTRATION_SOURCE_ATTACHED",
        "ExternalRegistrationSource",
        source.id,
        { accessMode: source.accessMode },
      );
    });
    revalidatePath(`/dersler/${source.courseId}`);
    return actionSuccess(
      source.accessMode === "WEBHOOK_ONLY"
        ? "Özel Sheet webhook kaynağı etkinleştirildi."
        : "Kaynak doğrulandı ve ilk senkron tamamlandı.",
    );
  } catch (error) {
    return failed(
      "attachGoogleSource",
      error,
      "Kaynak doğrulanamadı. Bağlantı, erişim modu ve mevcut kaynakları kontrol edin.",
    );
  }
}

export async function reconcileGoogleSource(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = id.safeParse(formValue(formData, "sourceId"));
  if (!parsed.success) return invalid();
  try {
    const { user } = await secure(["ADMIN"], async () => null);
    const source = await db.externalRegistrationSource.findUniqueOrThrow({
      where: { id: parsed.data },
    });
    if (source.accessMode === "WEBHOOK_ONLY")
      return actionError("Webhook-only kaynak CSV üzerinden uzlaştırılamaz.");
    const result = await reconcileSource(source.id, {
      allowInactive: true,
      forceFull: true,
    });
    await writeAudit(
      db,
      user.id,
      "REGISTRATION_SOURCE_RECONCILED",
      "ExternalRegistrationSource",
      source.id,
      { processed: result.processed },
    );
    revalidatePath(`/dersler/${source.courseId}`);
    return actionSuccess(`${result.processed} satır işlendi.`);
  } catch (error) {
    return failed(
      "reconcileGoogleSource",
      error,
      "Uzlaştırma başarısız oldu; kaynak kontrollü yeniden deneme kuyruğuna alındı.",
    );
  }
}

export async function createManualPreRegistration(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = manualPreRegistrationSchema.safeParse({
    courseId: formValue(formData, "courseId"),
    fullName: formValue(formData, "fullName"),
    phoneRaw: formValue(formData, "phoneRaw"),
    birthDate: formValue(formData, "birthDate"),
    district: formValue(formData, "district"),
  });
  if (!parsed.success)
    return actionError(parsed.error.issues[0]?.message ?? invalid().message);
  const phoneNormalized = normalizePhone(parsed.data.phoneRaw);
  if (!phoneNormalized)
    return actionError("Geçerli bir Türkiye telefon numarası girin.");
  try {
    const { user } = await secure(["ADMIN", "OPERATOR"], async () => null);
    await db.$transaction(async (tx) => {
      const course = await tx.course.findFirst({
        where: { id: parsed.data.courseId, status: "ACTIVE" },
      });
      if (!course) throw new Error("ACTIVE_COURSE_NOT_FOUND");
      const duplicate = await tx.preRegistration.findFirst({
        where: {
          courseId: course.id,
          fullName: { equals: parsed.data.fullName, mode: "insensitive" },
          phoneNormalized,
        },
      });
      if (duplicate) throw new Error("MANUAL_PRE_REGISTRATION_DUPLICATE");
      const spreadsheetId = `manual:${course.id}`;
      const source = await tx.externalRegistrationSource.upsert({
        where: {
          provider_spreadsheetId_sheetGid: {
            provider: "MANUAL",
            spreadsheetId,
            sheetGid: "0",
          },
        },
        update: {},
        create: {
          courseId: course.id,
          provider: "MANUAL",
          spreadsheetId,
          spreadsheetUrl: `manual://courses/${course.id}`,
          sheetGid: "0",
          sheetName: "Manuel kayıtlar",
          accessMode: "WEBHOOK_ONLY",
          status: "PAUSED",
          createdByUserId: user.id,
        },
      });
      const registration = await tx.preRegistration.create({
        data: {
          externalSourceId: source.id,
          courseId: course.id,
          sourceRecordId: `MANUAL:${randomUUID()}`,
          sourceCourseLabel: "Manuel kayıt",
          fullName: parsed.data.fullName,
          phoneRaw: parsed.data.phoneRaw,
          phoneNormalized,
          birthDate: parsed.data.birthDate
            ? new Date(parsed.data.birthDate)
            : null,
          district: parsed.data.district,
          assignedOperatorId: user.id,
          validationErrors: Prisma.JsonNull,
        },
      });
      await tx.preRegistrationActivity.create({
        data: {
          preRegistrationId: registration.id,
          actorUserId: user.id,
          activityType: "NOTE",
          note: "Manuel ön kayıt oluşturuldu.",
        },
      });
      await writeAudit(
        tx,
        user.id,
        "MANUAL_PRE_REGISTRATION_CREATED",
        "PreRegistration",
        registration.id,
        { courseId: course.id },
      );
    });
    revalidatePath("/on-kayitlar");
    return actionSuccess("Manuel ön kayıt oluşturuldu.");
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "MANUAL_PRE_REGISTRATION_DUPLICATE"
    )
      return actionError(
        "Bu ders için aynı ad ve telefonla bir ön kayıt zaten var.",
      );
    return failed(
      "createManualPreRegistration",
      error,
      "Manuel ön kayıt oluşturulamadı.",
    );
  }
}

const mutableStatuses = z.enum([
  "NEW",
  "IN_REVIEW",
  "CONTACTED",
  "APPROVED",
  "REJECTED",
]);

export async function changePreRegistrationStatus(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = z.object({ id, status: mutableStatuses }).safeParse({
    id: formValue(formData, "id"),
    status: formValue(formData, "status"),
  });
  if (!parsed.success) return invalid();
  try {
    const { user } = await secure(["ADMIN", "OPERATOR"], async () => null);
    await db.$transaction(async (tx) => {
      const current = await tx.preRegistration.findUniqueOrThrow({
        where: { id: parsed.data.id },
      });
      if (current.status === "CONVERTED")
        throw new Error("CONVERTED_IMMUTABLE");
      await tx.preRegistration.update({
        where: { id: current.id },
        data: {
          status: parsed.data.status,
          assignedOperatorId: current.assignedOperatorId ?? user.id,
        },
      });
      await tx.preRegistrationActivity.create({
        data: {
          preRegistrationId: current.id,
          actorUserId: user.id,
          activityType: "STATUS_CHANGE",
          fromStatus: current.status,
          toStatus: parsed.data.status,
        },
      });
      await writeAudit(
        tx,
        user.id,
        "PRE_REGISTRATION_STATUS_CHANGED",
        "PreRegistration",
        current.id,
        { from: current.status, to: parsed.data.status },
      );
    });
    revalidatePath("/on-kayitlar");
    return actionSuccess("Durum güncellendi.");
  } catch (error) {
    return failed("changePreRegistrationStatus", error);
  }
}

export async function addPreRegistrationNote(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = z.object({ id, note: requiredText(2000) }).safeParse({
    id: formValue(formData, "id"),
    note: formValue(formData, "note"),
  });
  if (!parsed.success) return invalid();
  try {
    const { user } = await secure(["ADMIN", "OPERATOR"], async () => null);
    await db.$transaction(async (tx) => {
      await tx.preRegistrationActivity.create({
        data: {
          preRegistrationId: parsed.data.id,
          actorUserId: user.id,
          activityType: "NOTE",
          note: parsed.data.note,
        },
      });
      await writeAudit(
        tx,
        user.id,
        "PRE_REGISTRATION_NOTE_ADDED",
        "PreRegistration",
        parsed.data.id,
      );
    });
    revalidatePath("/on-kayitlar");
    return actionSuccess("Not eklendi.");
  } catch (error) {
    return failed("addPreRegistrationNote", error);
  }
}

async function convertOnce(registrationId: string, userId: string) {
  return db.$transaction(
    async (tx) => {
      const registration = await tx.preRegistration.findUniqueOrThrow({
        where: { id: registrationId },
        include: { conversion: true, course: true },
      });
      if (registration.conversion) return;
      if (registration.status !== "APPROVED") throw new Error("NOT_APPROVED");
      const pieces = registration.fullName.trim().split(/\s+/);
      const lastName = pieces.length > 1 ? pieces.pop()! : "—";
      const firstName = pieces.join(" ") || registration.fullName;
      const existing = registration.phoneNormalized
        ? await tx.student.findFirst({
            where: { phone: registration.phoneNormalized },
          })
        : null;
      const student =
        existing ??
        (await tx.student.create({
          data: {
            firstName,
            lastName,
            phone: registration.phoneNormalized ?? registration.phoneRaw,
            birthDate: registration.birthDate,
            district: registration.district,
          },
        }));
      const enrollment = await tx.enrollment.upsert({
        where: {
          studentId_courseId: {
            studentId: student.id,
            courseId: registration.courseId,
          },
        },
        update: { status: "ACTIVE" },
        create: {
          studentId: student.id,
          courseId: registration.courseId,
          agreedFeeAmount: registration.course.studentFeeAmount,
          monthlySessionCount: registration.course.monthlySessionCount,
        },
      });
      await tx.preRegistrationConversion.create({
        data: {
          preRegistrationId: registrationId,
          studentId: student.id,
          enrollmentId: enrollment.id,
          convertedByUserId: userId,
        },
      });
      await tx.preRegistration.update({
        where: { id: registrationId },
        data: { status: "CONVERTED", assignedOperatorId: userId },
      });
      await tx.preRegistrationActivity.create({
        data: {
          preRegistrationId: registrationId,
          actorUserId: userId,
          activityType: "CONVERSION",
          fromStatus: registration.status,
          toStatus: "CONVERTED",
          note: `Öğrenci kaydı: ${student.id}`,
        },
      });
      await writeAudit(
        tx,
        userId,
        "PRE_REGISTRATION_CONVERTED",
        "PreRegistration",
        registrationId,
        { studentId: student.id, enrollmentId: enrollment.id },
      );
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function convertPreRegistration(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = id.safeParse(formValue(formData, "id"));
  if (!parsed.success) return invalid();
  try {
    const { user } = await secure(["ADMIN", "OPERATOR"], async () => null);
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await convertOnce(parsed.data, user.id);
        break;
      } catch (error) {
        const conflict =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === "P2034" || error.code === "P2002");
        if (!conflict || attempt === 3) throw error;
        await new Promise((resolve) => setTimeout(resolve, attempt * 75));
      }
    }
    revalidatePath("/on-kayitlar");
    revalidatePath("/ogrenciler");
    return actionSuccess("Ön kayıt öğrenci kaydına dönüştürüldü.");
  } catch (error) {
    return failed(
      "convertPreRegistration",
      error,
      "Dönüşüm tamamlanamadı. Kayıt durumunu kontrol edip yeniden deneyin.",
    );
  }
}

const sessionSchema = z.object({
  courseId: id,
  sessionDate: z.string().date(),
});
const sessionIdSchema = z.object({ sessionId: id });
const attendanceSchema = z.object({
  sessionId: id,
  enrollmentIds: z.array(id).max(1000),
});
const paymentSchema = z.object({
  studentId: id,
  amount: money,
  paidOn: z.string().date(),
});

export async function saveBulkAttendance(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = attendanceSchema.safeParse({
    sessionId: formValue(formData, "sessionId"),
    enrollmentIds: formData.getAll("presentEnrollmentId").map(String),
  });
  if (!parsed.success) return invalid();
  try {
    const { user } = await secure(["ADMIN", "OPERATOR"], async () => null);
    const courseId = await db.$transaction(async (tx) => {
      const session = await tx.lessonSession.findUniqueOrThrow({
        where: { id: parsed.data.sessionId },
      });
      const enrollments = await tx.enrollment.findMany({
        where: { courseId: session.courseId, status: "ACTIVE" },
        select: { id: true },
      });
      const activeIds = new Set(enrollments.map((enrollment) => enrollment.id));
      if (
        parsed.data.enrollmentIds.some(
          (enrollmentId) => !activeIds.has(enrollmentId),
        )
      )
        throw new Error("ATTENDANCE_ENROLLMENT_INVALID");
      await Promise.all(
        enrollments.map((enrollment) =>
          tx.lessonAttendance.upsert({
            where: {
              lessonSessionId_enrollmentId: {
                lessonSessionId: session.id,
                enrollmentId: enrollment.id,
              },
            },
            update: {
              status: parsed.data.enrollmentIds.includes(enrollment.id)
                ? "PRESENT"
                : "ABSENT",
              markedByUserId: user.id,
              markedAt: new Date(),
            },
            create: {
              lessonSessionId: session.id,
              enrollmentId: enrollment.id,
              status: parsed.data.enrollmentIds.includes(enrollment.id)
                ? "PRESENT"
                : "ABSENT",
              markedByUserId: user.id,
            },
          }),
        ),
      );
      await writeAudit(
        tx,
        user.id,
        "LESSON_ATTENDANCE_SAVED",
        "LessonSession",
        session.id,
        {
          presentCount: parsed.data.enrollmentIds.length,
          totalCount: enrollments.length,
        },
      );
      return session.courseId;
    });
    revalidatePath(`/dersler/${courseId}/oturumlar`);
    return actionSuccess("Yoklama toplu olarak kaydedildi.");
  } catch (error) {
    return failed("saveBulkAttendance", error, "Yoklama kaydedilemedi.");
  }
}

export async function createLessonSession(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = sessionSchema.safeParse({
    courseId: formValue(formData, "courseId"),
    sessionDate: formValue(formData, "sessionDate"),
  });
  if (!parsed.success) return invalid();
  try {
    const { user } = await secure(["ADMIN", "OPERATOR"], async () => null);
    await db.$transaction(async (tx) => {
      const session = await tx.lessonSession.create({
        data: {
          courseId: parsed.data.courseId,
          sessionDate: new Date(parsed.data.sessionDate),
        },
      });
      await writeAudit(
        tx,
        user.id,
        "LESSON_SESSION_CREATED",
        "LessonSession",
        session.id,
        { courseId: session.courseId, sessionDate: parsed.data.sessionDate },
      );
    });
    revalidatePath(`/dersler/${parsed.data.courseId}`);
    return actionSuccess("Ders oturumu planlandı.");
  } catch (error) {
    return failed(
      "createLessonSession",
      error,
      "Oturum oluşturulamadı; bu tarih için zaten bir oturum olabilir.",
    );
  }
}

export async function completeLessonSession(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = sessionIdSchema.safeParse({
    sessionId: formValue(formData, "sessionId"),
  });
  if (!parsed.success) return invalid();
  try {
    const { user } = await secure(["ADMIN", "OPERATOR"], async () => null);
    const courseId = await db.$transaction(
      async (tx) => {
        const session = await tx.lessonSession.findUniqueOrThrow({
          where: { id: parsed.data.sessionId },
          include: { course: true },
        });
        if (session.status !== "PLANNED")
          throw new Error("SESSION_NOT_PLANNED");
        const range = monthRange(session.sessionDate);
        const completed = await tx.lessonSession.count({
          where: {
            courseId: session.courseId,
            status: "COMPLETED",
            sessionDate: { gte: range.start, lt: range.end },
          },
        });
        if (completed >= session.course.monthlySessionCount)
          throw new Error("MONTHLY_SESSION_LIMIT");
        const enrollments = await tx.enrollment.findMany({
          where: {
            courseId: session.courseId,
            status: "ACTIVE",
            enrollmentDate: { lte: session.sessionDate },
          },
        });
        await tx.lessonSession.update({
          where: { id: session.id },
          data: { status: "COMPLETED" },
        });
        for (const enrollment of enrollments) {
          const existingCharges = await tx.studentAccountEntry.count({
            where: {
              enrollmentId: enrollment.id,
              entryType: "SESSION_CHARGE",
              occurredOn: { gte: range.start, lt: range.end },
            },
          });
          if (existingCharges >= enrollment.monthlySessionCount) continue;
          const amount = sessionChargeAmount(
            enrollment.agreedFeeAmount,
            enrollment.monthlySessionCount,
            existingCharges,
          ).negated();
          await tx.studentAccountEntry.create({
            data: {
              studentId: enrollment.studentId,
              enrollmentId: enrollment.id,
              lessonSessionId: session.id,
              entryType: "SESSION_CHARGE",
              amount,
              occurredOn: session.sessionDate,
              createdByUserId: user.id,
            },
          });
        }
        await writeAudit(
          tx,
          user.id,
          "LESSON_SESSION_COMPLETED",
          "LessonSession",
          session.id,
          { chargedEnrollments: enrollments.length },
        );
        return session.courseId;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    revalidatePath(`/dersler/${courseId}`);
    revalidatePath("/ogrenciler");
    return actionSuccess("Oturum tamamlandı; aktif öğrencilere borç işlendi.");
  } catch (error) {
    return failed(
      "completeLessonSession",
      error,
      "Oturum tamamlanamadı. Oturum durumunu ve aylık planlı oturum sayısını kontrol edin.",
    );
  }
}

export async function cancelLessonSession(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = sessionIdSchema.safeParse({
    sessionId: formValue(formData, "sessionId"),
  });
  if (!parsed.success) return invalid();
  try {
    const { user } = await secure(["ADMIN"], async () => null);
    const courseId = await db.$transaction(async (tx) => {
      const session = await tx.lessonSession.findUniqueOrThrow({
        where: { id: parsed.data.sessionId },
      });
      if (session.status === "CANCELLED") throw new Error("SESSION_CANCELLED");
      if (session.status === "COMPLETED") {
        const charges = await tx.studentAccountEntry.findMany({
          where: { lessonSessionId: session.id, entryType: "SESSION_CHARGE" },
        });
        for (const charge of charges) {
          await tx.studentAccountEntry.create({
            data: {
              studentId: charge.studentId,
              enrollmentId: charge.enrollmentId,
              lessonSessionId: session.id,
              entryType: "SESSION_REVERSAL",
              amount: charge.amount.negated(),
              occurredOn: session.sessionDate,
              createdByUserId: user.id,
            },
          });
        }
      }
      await tx.lessonSession.update({
        where: { id: session.id },
        data: { status: "CANCELLED" },
      });
      await writeAudit(
        tx,
        user.id,
        "LESSON_SESSION_CANCELLED",
        "LessonSession",
        session.id,
      );
      return session.courseId;
    });
    revalidatePath(`/dersler/${courseId}`);
    revalidatePath("/ogrenciler");
    return actionSuccess("Oturum iptal edildi; oluşan borçlar geri alındı.");
  } catch (error) {
    return failed("cancelLessonSession", error);
  }
}

export async function recordStudentPayment(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = paymentSchema.safeParse({
    studentId: formValue(formData, "studentId"),
    amount: formValue(formData, "amount"),
    paidOn: formValue(formData, "paidOn"),
  });
  if (!parsed.success) return invalid();
  try {
    const { user } = await secure(["ADMIN", "OPERATOR"], async () => null);
    await db.$transaction(async (tx) => {
      await tx.student.findUniqueOrThrow({
        where: { id: parsed.data.studentId },
      });
      const entry = await tx.studentAccountEntry.create({
        data: {
          studentId: parsed.data.studentId,
          entryType: "PAYMENT",
          amount: parsed.data.amount,
          occurredOn: new Date(parsed.data.paidOn),
          createdByUserId: user.id,
        },
      });
      await writeAudit(
        tx,
        user.id,
        "STUDENT_PAYMENT_RECORDED",
        "StudentAccountEntry",
        entry.id,
        {
          studentId: parsed.data.studentId,
          amount: parsed.data.amount.toString(),
          paidOn: parsed.data.paidOn,
        },
      );
    });
    revalidatePath(`/ogrenciler/${parsed.data.studentId}`);
    revalidatePath("/ogrenciler");
    return actionSuccess("Ödeme öğrenci bakiyesine eklendi.");
  } catch (error) {
    return failed("recordStudentPayment", error);
  }
}

const strongPassword = z
  .string()
  .min(14)
  .max(200)
  .refine(
    (value) =>
      /[A-ZÇĞİÖŞÜ]/.test(value) &&
      /[a-zçğıöşü]/.test(value) &&
      /\d/.test(value),
    {
      message:
        "Parola en az 14 karakter, büyük/küçük harf ve rakam içermelidir.",
    },
  );
const userSchema = z.object({
  displayName: requiredText(120),
  email: z.string().trim().toLowerCase().email().max(254),
  role: z.enum(["ADMIN", "OPERATOR", "VIEWER"]),
  password: strongPassword,
});

export async function createAppUser(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = userSchema.safeParse({
    displayName: formValue(formData, "displayName"),
    email: formValue(formData, "email"),
    role: formValue(formData, "role"),
    password: formValue(formData, "password"),
  });
  if (!parsed.success)
    return actionError(parsed.error.issues[0]?.message ?? invalid().message);
  try {
    const { user } = await secure(["ADMIN"], async () => null);
    const passwordHash = await hashPassword(parsed.data.password);
    await db.$transaction(async (tx) => {
      const created = await tx.appUser.create({
        data: {
          displayName: parsed.data.displayName,
          email: parsed.data.email,
          role: parsed.data.role,
          passwordHash,
        },
      });
      await writeAudit(tx, user.id, "APP_USER_CREATED", "AppUser", created.id, {
        role: created.role,
      });
    });
    revalidatePath("/kullanicilar");
    return actionSuccess("Kullanıcı oluşturuldu.");
  } catch (error) {
    return failed(
      "createAppUser",
      error,
      "Kullanıcı oluşturulamadı; e-posta daha önce kullanılmış olabilir.",
    );
  }
}

export async function updateAppUser(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = z
    .object({
      id,
      role: z.enum(["ADMIN", "OPERATOR", "VIEWER"]),
      password: z.union([z.literal(""), strongPassword]),
      isActive: z
        .enum(["true", "false"])
        .transform((value) => value === "true"),
    })
    .safeParse({
      id: formValue(formData, "id"),
      role: formValue(formData, "role"),
      password: formValue(formData, "password"),
      isActive: formValue(formData, "isActive"),
    });
  if (!parsed.success)
    return actionError(parsed.error.issues[0]?.message ?? invalid().message);
  try {
    const { user } = await secure(["ADMIN"], async () => null);
    if (
      parsed.data.id === user.id &&
      (!parsed.data.isActive || parsed.data.role !== "ADMIN")
    )
      return actionError(
        "Kendi yönetici hesabınızı pasifleştiremez veya rolünü düşüremezsiniz.",
      );
    const passwordHash = parsed.data.password
      ? await hashPassword(parsed.data.password)
      : undefined;
    await db.$transaction(async (tx) => {
      const updated = await tx.appUser.update({
        where: { id: parsed.data.id },
        data: {
          role: parsed.data.role,
          isActive: parsed.data.isActive,
          ...(passwordHash
            ? { passwordHash, failedLoginCount: 0, lockedUntil: null }
            : {}),
        },
      });
      if (!updated.isActive || passwordHash)
        await tx.userSession.deleteMany({ where: { userId: updated.id } });
      await writeAudit(tx, user.id, "APP_USER_UPDATED", "AppUser", updated.id, {
        role: updated.role,
        isActive: updated.isActive,
        passwordRotated: Boolean(passwordHash),
      });
    });
    revalidatePath("/kullanicilar");
    return actionSuccess("Kullanıcı güncellendi.");
  } catch (error) {
    return failed("updateAppUser", error);
  }
}
