import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.appUser.count({ take: 1 });
    return Response.json({ status: "ready" });
  } catch {
    return Response.json({ status: "not_ready" }, { status: 503 });
  }
}
