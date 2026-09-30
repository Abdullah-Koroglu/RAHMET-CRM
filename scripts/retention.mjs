import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const days = Number.parseInt(process.env.RETENTION_DAYS ?? "730", 10);
  if (!Number.isInteger(days) || days < 30 || days > 3650) throw new Error("RETENTION_DAYS 30-3650 arasında olmalıdır.");
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const where = { status: "REJECTED", receivedAt: { lt: cutoff }, conversion: null };
  const count = await prisma.preRegistration.count({ where });
  if (process.env.CONFIRM_RETENTION !== "YES") {
    console.log(JSON.stringify({ dryRun: true, count, cutoff: cutoff.toISOString() }));
    return;
  }
  const result = await prisma.preRegistration.updateMany({
    where,
    data: { fullName: "Anonimleştirildi", phoneRaw: "", phoneNormalized: null, birthDate: null, district: null, previousCourse: null, maritalStatus: null, childrenCount: null, educationLevel: null, discoveryChannel: null, validationErrors: ["RETENTION_ANONYMIZED"] },
  });
  await prisma.auditLog.create({ data: { action: "RETENTION_ANONYMIZATION", entityType: "PreRegistration", metadata: { count: result.count, cutoff: cutoff.toISOString() } } });
  console.log(JSON.stringify({ dryRun: false, count: result.count, cutoff: cutoff.toISOString() }));
}

main().finally(() => prisma.$disconnect());
