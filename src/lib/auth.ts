import "server-only";

import type { AppRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";

export type CurrentUser = {
  id: string;
  displayName: string;
  email: string;
  role: AppRole;
};

export async function getOptionalUser(): Promise<CurrentUser | null> {
  const session = await readSession();
  if (!session || session.expiresAt <= new Date() || !session.user.isActive || !session.user.passwordHash) return null;
  return { id: session.user.id, displayName: session.user.displayName, email: session.user.email, role: session.user.role };
}

export async function getCurrentUser() {
  const user = await getOptionalUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(allowed: AppRole[]) {
  const user = await getCurrentUser();
  if (!allowed.includes(user.role)) redirect("/yetkisiz");
  return user;
}

export function canMutateOperations(role: AppRole) {
  return role === "ADMIN" || role === "OPERATOR";
}
