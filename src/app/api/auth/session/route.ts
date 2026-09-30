import { assertRequestSameOrigin } from "@/lib/csrf";
import { rotateSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    assertRequestSameOrigin(request);
    const ok = await rotateSession();
    return Response.json({ ok }, { status: ok ? 200 : 401 });
  } catch {
    return Response.json({ error: "invalid_origin" }, { status: 403 });
  }
}
