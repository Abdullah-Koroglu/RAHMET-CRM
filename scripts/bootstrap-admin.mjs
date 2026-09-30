import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const scrypt = promisify(scryptCallback);

async function passwordHash(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$32768$8$1$${salt.toString("hex")}$${derived.toString("hex")}`;
}

async function main() {
  if (process.env.CONFIRM_BOOTSTRAP !== "YES") throw new Error("CONFIRM_BOOTSTRAP=YES zorunludur.");
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const displayName = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "";
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("Geçerli BOOTSTRAP_ADMIN_EMAIL zorunludur.");
  if (!displayName || displayName.length > 120) throw new Error("BOOTSTRAP_ADMIN_NAME zorunludur ve 120 karakteri aşamaz.");
  if (password.length < 14 || !/[A-ZÇĞİÖŞÜ]/.test(password) || !/[a-zçğıöşü]/.test(password) || !/\d/.test(password)) {
    throw new Error("Admin parolası en az 14 karakter, büyük/küçük harf ve rakam içermelidir.");
  }
  const existing = await prisma.appUser.findUnique({ where: { email } });
  if (existing && existing.role !== "ADMIN") throw new Error("Bu e-posta ADMIN olmayan mevcut bir hesaba ait; rol yükseltme kullanıcı yönetimi ekranından yapılmalıdır.");
  const hash = await passwordHash(password);
  const user = await prisma.appUser.upsert({
    where: { email },
    update: { displayName, passwordHash: hash, isActive: true },
    create: { email, displayName, passwordHash: hash, role: "ADMIN", isActive: true },
  });
  await prisma.userSession.deleteMany({ where: { userId: user.id } });
  await prisma.auditLog.create({ data: { actorUserId: user.id, action: "ADMIN_BOOTSTRAPPED", entityType: "AppUser", entityId: user.id } });
  console.log(JSON.stringify({ ok: true, userId: user.id }));
}

main().finally(() => prisma.$disconnect());
