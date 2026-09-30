import type { Prisma, PrismaClient } from "@prisma/client";
import { headers } from "next/headers";

type DbClient = Prisma.TransactionClient | PrismaClient;

export async function writeAudit(client: DbClient, actorUserId: string | null, action: string, entityType: string, entityId?: string | null, metadata?: Prisma.InputJsonValue) {
  const requestId = (await headers()).get("x-request-id")?.slice(0, 100) ?? null;
  return client.auditLog.create({ data: { actorUserId, action, entityType, entityId, requestId, metadata } });
}
