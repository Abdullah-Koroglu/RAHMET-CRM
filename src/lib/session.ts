import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "rahmet_session";
const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;
export const SESSION_ROTATION_MS = 30 * 60 * 1000;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cookieOptions(expires: Date) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", expires, priority: "high" as const };
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
  await db.$transaction([
    db.userSession.deleteMany({ where: { OR: [{ userId }, { expiresAt: { lte: new Date() } }] } }),
    db.userSession.create({ data: { userId, tokenHash: tokenHash(token), expiresAt } }),
  ]);
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

export async function readSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return db.userSession.findUnique({ where: { tokenHash: tokenHash(token) }, include: { user: true } });
}

export async function rotateSession() {
  const cookieStore = await cookies();
  const currentToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!currentToken) return false;
  const current = await db.userSession.findUnique({ where: { tokenHash: tokenHash(currentToken) } });
  if (!current || current.expiresAt <= new Date()) {
    cookieStore.delete(SESSION_COOKIE);
    return false;
  }
  if (Date.now() - current.lastSeenAt.getTime() < SESSION_ROTATION_MS) return true;
  const nextToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
  await db.$transaction([
    db.userSession.delete({ where: { id: current.id } }),
    db.userSession.create({ data: { userId: current.userId, tokenHash: tokenHash(nextToken), expiresAt, lastSeenAt: new Date() } }),
  ]);
  cookieStore.set(SESSION_COOKIE, nextToken, cookieOptions(expiresAt));
  return true;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await db.userSession.deleteMany({ where: { tokenHash: tokenHash(token) } });
  cookieStore.delete(SESSION_COOKIE);
}
