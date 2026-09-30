import { getOptionalUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getOptionalUser();
  if (!user || user.role !== "ADMIN") return Response.json({ error: "forbidden" }, { status: 403 });
  const [active, errors, deadLetters, retryDue] = await Promise.all([
    db.externalRegistrationSource.count({ where: { status: "ACTIVE" } }),
    db.externalRegistrationSource.count({ where: { status: "ERROR" } }),
    db.integrationEvent.count({ where: { status: "DEAD_LETTER" } }),
    db.externalRegistrationSource.count({ where: { status: "ERROR", nextRetryAt: { lte: new Date() } } }),
  ]);
  return Response.json({ active, errors, deadLetters, retryDue });
}
