"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { actionError, type ActionState } from "@/lib/action-state";
import { assertSameOrigin } from "@/lib/csrf";
import { db } from "@/lib/db";
import { DUMMY_PASSWORD_HASH, verifyPassword } from "@/lib/password";
import { createSession, deleteSession, readSession } from "@/lib/session";
import { log, safeErrorCode } from "@/lib/logger";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

export async function loginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
    if (!parsed.success) return actionError("E-posta veya parola geçersiz.");
    const user = await db.appUser.findUnique({ where: { email: parsed.data.email } });
    const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    const locked = Boolean(user?.lockedUntil && user.lockedUntil > new Date());
    if (!user || !user.isActive || !user.passwordHash || !valid || locked) {
      if (user && !locked) {
        const nextCount = user.failedLoginCount + 1;
        await db.appUser.update({
          where: { id: user.id },
          data: { failedLoginCount: nextCount, lockedUntil: nextCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null },
        });
      }
      return actionError("E-posta veya parola geçersiz. Çok sayıda hatalı denemede erişim geçici olarak kilitlenir.");
    }
    await db.$transaction([
      db.appUser.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } }),
      db.auditLog.create({ data: { actorUserId: user.id, action: "LOGIN_SUCCEEDED", entityType: "AppUser", entityId: user.id } }),
    ]);
    await createSession(user.id);
  } catch (error) {
    const requestId = (await headers()).get("x-request-id")?.slice(0, 100);
    log("error", "login_action_failed", { code: safeErrorCode(error), requestId });
    return actionError("Oturum açılamadı. Lütfen yeniden deneyin.");
  }
  redirect("/");
}

export async function logoutAction() {
  await assertSameOrigin();
  const session = await readSession();
  if (session) await db.auditLog.create({ data: { actorUserId: session.userId, action: "LOGOUT", entityType: "AppUser", entityId: session.userId } });
  await deleteSession();
  redirect("/login");
}
