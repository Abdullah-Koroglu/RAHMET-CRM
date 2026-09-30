"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { actionError, actionSuccess, type ActionState } from "@/lib/action-state";
import { writeAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { db } from "@/lib/db";
import { parseGoogleSheetUrl, reconcileSource } from "@/lib/google-forms";
import { hashPassword } from "@/lib/password";
import { log, safeErrorCode } from "@/lib/logger";

const id = z.string().uuid();
const requiredText = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null);
const money = z.string().trim().regex(/^\d{1,9}(?:\.\d{1,2})?$/).transform((value) => new Prisma.Decimal(value));
const formValue = (formData: FormData, key: string) => String(formData.get(key) ?? "");

const academicYearSchema = z.object({
  displayName: requiredText(50),
  startDate: z.string().date(),
  endDate: z.string().date(),
}).refine((value) => value.startDate <= value.endDate, { message: "Bitiş tarihi başlangıçtan önce olamaz." });

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
  teacherFeeAmount: money,
});

async function secure<T>(roles: ("ADMIN" | "OPERATOR" | "VIEWER")[], operation: () => Promise<T>) {
  await assertSameOrigin();
  const user = await requireRole(roles);
  return { user, result: await operation() };
}

function invalid() {
  return actionError("Girilen bilgiler geçerli değil veya izin verilen sınırları aşıyor.");
}

async function failed(action: string, error: unknown, message?: string) {
  const requestId = (await headers()).get("x-request-id")?.slice(0, 100);
  log("error", "server_action_failed", { action, code: safeErrorCode(error), requestId });
  return actionError(message);
}

export async function createAcademicYear(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = academicYearSchema.safeParse({ displayName: formValue(formData, "displayName"), startDate: formValue(formData, "startDate"), endDate: formValue(formData, "endDate") });
  if (!parsed.success) return actionError(parsed.error.issues[0]?.message ?? invalid().message);
  try {
    const { user } = await secure(["ADMIN"], async () => null);
    await db.$transaction(async (tx) => {
      const year = await tx.academicYear.create({ data: { displayName: parsed.data.displayName, startDate: new Date(parsed.data.startDate), endDate: new Date(parsed.data.endDate), status: "ACTIVE" } });
      await writeAudit(tx, user.id, "ACADEMIC_YEAR_CREATED", "AcademicYear", year.id);
    });
    revalidatePath("/akademik-yillar");
    return actionSuccess("Akademik yıl oluşturuldu.");
  } catch (error) { return failed("createAcademicYear", error); }
}

export async function createTeacher(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = teacherSchema.safeParse({ firstName: formValue(formData, "firstName"), lastName: formValue(formData, "lastName"), phone: formValue(formData, "phone"), employmentType: formValue(formData, "employmentType") });
  if (!parsed.success) return invalid();
  try {
    const { user } = await secure(["ADMIN"], async () => null);
    await db.$transaction(async (tx) => {
      const teacher = await tx.teacher.create({ data: parsed.data });
      await writeAudit(tx, user.id, "TEACHER_CREATED", "Teacher", teacher.id);
    });
    revalidatePath("/ogretmenler");
    return actionSuccess("Öğretmen oluşturuldu.");
  } catch (error) { return failed("createTeacher", error); }
}

export async function createCourse(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = courseSchema.safeParse({ name: formValue(formData, "name"), academicYearId: formValue(formData, "academicYearId"), teacherId: formValue(formData, "teacherId"), studentFeeAmount: formValue(formData, "studentFeeAmount"), teacherFeeAmount: formValue(formData, "teacherFeeAmount") });
  if (!parsed.success) return invalid();
  let courseId: string;
  try {
    const { user } = await secure(["ADMIN"], async () => null);
    courseId = await db.$transaction(async (tx) => {
      const course = await tx.course.create({ data: parsed.data });
      await writeAudit(tx, user.id, "COURSE_CREATED", "Course", course.id);
      return course.id;
    });
  } catch (error) { return failed("createCourse", error); }
  redirect(`/dersler/${courseId}`);
}

export async function updateCourse(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = courseSchema.extend({ id }).safeParse({ id: formValue(formData, "id"), name: formValue(formData, "name"), academicYearId: formValue(formData, "academicYearId"), teacherId: formValue(formData, "teacherId"), studentFeeAmount: formValue(formData, "studentFeeAmount"), teacherFeeAmount: formValue(formData, "teacherFeeAmount") });
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
  } catch (error) { return failed("updateCourse", error); }
}

const sourceSchema = z.object({ courseId: id, spreadsheetUrl: z.string().trim().url().max(500), accessMode: z.enum(["PUBLIC_CSV", "WEBHOOK_ONLY"]) });

export async function attachGoogleSource(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsedInput = sourceSchema.safeParse({ courseId: formValue(formData, "courseId"), spreadsheetUrl: formValue(formData, "spreadsheetUrl"), accessMode: formValue(formData, "accessMode") || "PUBLIC_CSV" });
  if (!parsedInput.success) return invalid();
  try {
    const { user } = await secure(["ADMIN"], async () => null);
    const parsed = parseGoogleSheetUrl(parsedInput.data.spreadsheetUrl);
    const source = await db.externalRegistrationSource.create({
      data: { courseId: parsedInput.data.courseId, spreadsheetId: parsed.spreadsheetId, spreadsheetUrl: parsed.canonicalUrl, sheetGid: parsed.sheetGid, sheetName: "Form Yanıtları 1", accessMode: parsedInput.data.accessMode, status: "PAUSED", secretReference: "GOOGLE_FORMS_WEBHOOK_SECRET", createdByUserId: user.id },
    });
    if (source.accessMode === "PUBLIC_CSV") await reconcileSource(source.id, { allowInactive: true, forceFull: true });
    await db.$transaction(async (tx) => {
      await tx.externalRegistrationSource.updateMany({ where: { courseId: source.courseId, status: "ACTIVE", id: { not: source.id } }, data: { status: "ARCHIVED", nextRetryAt: null } });
      await tx.externalRegistrationSource.update({ where: { id: source.id }, data: { status: "ACTIVE", nextRetryAt: null } });
      await writeAudit(tx, user.id, "REGISTRATION_SOURCE_ATTACHED", "ExternalRegistrationSource", source.id, { accessMode: source.accessMode });
    });
    revalidatePath(`/dersler/${source.courseId}`);
    return actionSuccess(source.accessMode === "WEBHOOK_ONLY" ? "Özel Sheet webhook kaynağı etkinleştirildi." : "Kaynak doğrulandı ve ilk senkron tamamlandı.");
  } catch (error) { return failed("attachGoogleSource", error, "Kaynak doğrulanamadı. Bağlantı, erişim modu ve mevcut kaynakları kontrol edin."); }
}

export async function reconcileGoogleSource(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = id.safeParse(formValue(formData, "sourceId"));
  if (!parsed.success) return invalid();
  try {
    const { user } = await secure(["ADMIN"], async () => null);
    const source = await db.externalRegistrationSource.findUniqueOrThrow({ where: { id: parsed.data } });
    if (source.accessMode === "WEBHOOK_ONLY") return actionError("Webhook-only kaynak CSV üzerinden uzlaştırılamaz.");
    const result = await reconcileSource(source.id, { allowInactive: true, forceFull: true });
    await writeAudit(db, user.id, "REGISTRATION_SOURCE_RECONCILED", "ExternalRegistrationSource", source.id, { processed: result.processed });
    revalidatePath(`/dersler/${source.courseId}`);
    return actionSuccess(`${result.processed} satır işlendi.`);
  } catch (error) { return failed("reconcileGoogleSource", error, "Uzlaştırma başarısız oldu; kaynak kontrollü yeniden deneme kuyruğuna alındı."); }
}

const mutableStatuses = z.enum(["NEW", "IN_REVIEW", "CONTACTED", "APPROVED", "REJECTED"]);

export async function changePreRegistrationStatus(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ id, status: mutableStatuses }).safeParse({ id: formValue(formData, "id"), status: formValue(formData, "status") });
  if (!parsed.success) return invalid();
  try {
    const { user } = await secure(["ADMIN", "OPERATOR"], async () => null);
    await db.$transaction(async (tx) => {
      const current = await tx.preRegistration.findUniqueOrThrow({ where: { id: parsed.data.id } });
      if (current.status === "CONVERTED") throw new Error("CONVERTED_IMMUTABLE");
      await tx.preRegistration.update({ where: { id: current.id }, data: { status: parsed.data.status, assignedOperatorId: current.assignedOperatorId ?? user.id } });
      await tx.preRegistrationActivity.create({ data: { preRegistrationId: current.id, actorUserId: user.id, activityType: "STATUS_CHANGE", fromStatus: current.status, toStatus: parsed.data.status } });
      await writeAudit(tx, user.id, "PRE_REGISTRATION_STATUS_CHANGED", "PreRegistration", current.id, { from: current.status, to: parsed.data.status });
    });
    revalidatePath("/on-kayitlar");
    return actionSuccess("Durum güncellendi.");
  } catch (error) { return failed("changePreRegistrationStatus", error); }
}

export async function addPreRegistrationNote(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ id, note: requiredText(2000) }).safeParse({ id: formValue(formData, "id"), note: formValue(formData, "note") });
  if (!parsed.success) return invalid();
  try {
    const { user } = await secure(["ADMIN", "OPERATOR"], async () => null);
    await db.$transaction(async (tx) => {
      await tx.preRegistrationActivity.create({ data: { preRegistrationId: parsed.data.id, actorUserId: user.id, activityType: "NOTE", note: parsed.data.note } });
      await writeAudit(tx, user.id, "PRE_REGISTRATION_NOTE_ADDED", "PreRegistration", parsed.data.id);
    });
    revalidatePath("/on-kayitlar");
    return actionSuccess("Not eklendi.");
  } catch (error) { return failed("addPreRegistrationNote", error); }
}

async function convertOnce(registrationId: string, userId: string) {
  return db.$transaction(async (tx) => {
    const registration = await tx.preRegistration.findUniqueOrThrow({ where: { id: registrationId }, include: { conversion: true, course: true } });
    if (registration.conversion) return;
    if (registration.status !== "APPROVED") throw new Error("NOT_APPROVED");
    const pieces = registration.fullName.trim().split(/\s+/);
    const lastName = pieces.length > 1 ? pieces.pop()! : "—";
    const firstName = pieces.join(" ") || registration.fullName;
    const existing = registration.phoneNormalized ? await tx.student.findFirst({ where: { phone: registration.phoneNormalized } }) : null;
    const student = existing ?? await tx.student.create({ data: { firstName, lastName, phone: registration.phoneNormalized ?? registration.phoneRaw, birthDate: registration.birthDate, district: registration.district } });
    const enrollment = await tx.enrollment.upsert({ where: { studentId_courseId: { studentId: student.id, courseId: registration.courseId } }, update: { status: "ACTIVE" }, create: { studentId: student.id, courseId: registration.courseId, agreedFeeAmount: registration.course.studentFeeAmount } });
    await tx.preRegistrationConversion.create({ data: { preRegistrationId: registrationId, studentId: student.id, enrollmentId: enrollment.id, convertedByUserId: userId } });
    await tx.preRegistration.update({ where: { id: registrationId }, data: { status: "CONVERTED", assignedOperatorId: userId } });
    await tx.preRegistrationActivity.create({ data: { preRegistrationId: registrationId, actorUserId: userId, activityType: "CONVERSION", fromStatus: registration.status, toStatus: "CONVERTED", note: `Öğrenci kaydı: ${student.id}` } });
    await writeAudit(tx, userId, "PRE_REGISTRATION_CONVERTED", "PreRegistration", registrationId, { studentId: student.id, enrollmentId: enrollment.id });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function convertPreRegistration(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = id.safeParse(formValue(formData, "id"));
  if (!parsed.success) return invalid();
  try {
    const { user } = await secure(["ADMIN", "OPERATOR"], async () => null);
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try { await convertOnce(parsed.data, user.id); break; }
      catch (error) {
        const conflict = error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || error.code === "P2002");
        if (!conflict || attempt === 3) throw error;
        await new Promise((resolve) => setTimeout(resolve, attempt * 75));
      }
    }
    revalidatePath("/on-kayitlar");
    revalidatePath("/ogrenciler");
    return actionSuccess("Ön kayıt öğrenci kaydına dönüştürüldü.");
  } catch (error) { return failed("convertPreRegistration", error, "Dönüşüm tamamlanamadı. Kayıt durumunu kontrol edip yeniden deneyin."); }
}

const strongPassword = z.string().min(14).max(200).refine((value) => /[A-ZÇĞİÖŞÜ]/.test(value) && /[a-zçğıöşü]/.test(value) && /\d/.test(value), { message: "Parola en az 14 karakter, büyük/küçük harf ve rakam içermelidir." });
const userSchema = z.object({ displayName: requiredText(120), email: z.string().trim().toLowerCase().email().max(254), role: z.enum(["ADMIN", "OPERATOR", "VIEWER"]), password: strongPassword });

export async function createAppUser(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = userSchema.safeParse({ displayName: formValue(formData, "displayName"), email: formValue(formData, "email"), role: formValue(formData, "role"), password: formValue(formData, "password") });
  if (!parsed.success) return actionError(parsed.error.issues[0]?.message ?? invalid().message);
  try {
    const { user } = await secure(["ADMIN"], async () => null);
    const passwordHash = await hashPassword(parsed.data.password);
    await db.$transaction(async (tx) => {
      const created = await tx.appUser.create({ data: { displayName: parsed.data.displayName, email: parsed.data.email, role: parsed.data.role, passwordHash } });
      await writeAudit(tx, user.id, "APP_USER_CREATED", "AppUser", created.id, { role: created.role });
    });
    revalidatePath("/kullanicilar");
    return actionSuccess("Kullanıcı oluşturuldu.");
  } catch (error) { return failed("createAppUser", error, "Kullanıcı oluşturulamadı; e-posta daha önce kullanılmış olabilir."); }
}

export async function updateAppUser(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ id, role: z.enum(["ADMIN", "OPERATOR", "VIEWER"]), password: z.union([z.literal(""), strongPassword]), isActive: z.enum(["true", "false"]).transform((value) => value === "true") }).safeParse({ id: formValue(formData, "id"), role: formValue(formData, "role"), password: formValue(formData, "password"), isActive: formValue(formData, "isActive") });
  if (!parsed.success) return actionError(parsed.error.issues[0]?.message ?? invalid().message);
  try {
    const { user } = await secure(["ADMIN"], async () => null);
    if (parsed.data.id === user.id && (!parsed.data.isActive || parsed.data.role !== "ADMIN")) return actionError("Kendi yönetici hesabınızı pasifleştiremez veya rolünü düşüremezsiniz.");
    const passwordHash = parsed.data.password ? await hashPassword(parsed.data.password) : undefined;
    await db.$transaction(async (tx) => {
      const updated = await tx.appUser.update({ where: { id: parsed.data.id }, data: { role: parsed.data.role, isActive: parsed.data.isActive, ...(passwordHash ? { passwordHash, failedLoginCount: 0, lockedUntil: null } : {}) } });
      if (!updated.isActive || passwordHash) await tx.userSession.deleteMany({ where: { userId: updated.id } });
      await writeAudit(tx, user.id, "APP_USER_UPDATED", "AppUser", updated.id, { role: updated.role, isActive: updated.isActive, passwordRotated: Boolean(passwordHash) });
    });
    revalidatePath("/kullanicilar");
    return actionSuccess("Kullanıcı güncellendi.");
  } catch (error) { return failed("updateAppUser", error); }
}
