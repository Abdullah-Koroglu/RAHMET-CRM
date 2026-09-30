import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEMO_SEED !== "true") throw new Error("Demo seed yalnız ALLOW_DEMO_SEED=true ile production dışında çalışır.");
  const adminEmail = process.env.DEV_ADMIN_EMAIL ?? "admin@rahmet.local";
  const adminPassword = process.env.DEV_ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 14) throw new Error("DEV_ADMIN_PASSWORD en az 14 karakter olmalıdır.");
  const passwordHash = await hashPassword(adminPassword);

  const admin = await prisma.appUser.upsert({
    where: { email: adminEmail },
    update: { isActive: true, passwordHash },
    create: { email: adminEmail, displayName: "RAHMET Geliştirme Yöneticisi", role: "ADMIN", passwordHash },
  });

  const year = await prisma.academicYear.upsert({
    where: { displayName: "2026-2027" },
    update: {},
    create: {
      displayName: "2026-2027",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2027-06-30"),
      status: "ACTIVE",
    },
  });

  const teacher = await prisma.teacher.findFirst({ where: { firstName: "Demo", lastName: "Eğitmen" } })
    ?? await prisma.teacher.create({ data: { firstName: "Demo", lastName: "Eğitmen", employmentType: "INTERNAL" } });

  const courses = [
    {
      name: "Siyer-i Nebi",
      spreadsheetId: "DEMO_SIYER_RESPONSES",
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/DEMO_SIYER_RESPONSES/edit?gid=0",
      sheetGid: "0",
    },
    {
      name: "Peygamberler Tarihi",
      spreadsheetId: "DEMO_PEYGAMBERLER_RESPONSES",
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/DEMO_PEYGAMBERLER_RESPONSES/edit?gid=0",
      sheetGid: "0",
    },
  ];

  for (const item of courses) {
    const course = await prisma.course.upsert({
      where: { academicYearId_name: { academicYearId: year.id, name: item.name } },
      update: {},
      create: { name: item.name, academicYearId: year.id, teacherId: teacher.id },
    });
    await prisma.externalRegistrationSource.upsert({
      where: { provider_spreadsheetId_sheetGid: { provider: "GOOGLE_FORMS_SHEET", spreadsheetId: item.spreadsheetId, sheetGid: item.sheetGid } },
      update: { courseId: course.id, spreadsheetUrl: item.spreadsheetUrl },
      create: {
        courseId: course.id,
        provider: "GOOGLE_FORMS_SHEET",
        spreadsheetId: item.spreadsheetId,
        spreadsheetUrl: item.spreadsheetUrl,
        sheetGid: item.sheetGid,
        sheetName: "Form Yanıtları 1",
        status: "PAUSED",
        secretReference: "GOOGLE_FORMS_WEBHOOK_SECRET",
        createdByUserId: admin.id,
      },
    });
  }
}

main().finally(() => prisma.$disconnect());
