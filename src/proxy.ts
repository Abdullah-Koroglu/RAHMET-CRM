import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

const publicPaths = ["/login", "/api/health", "/api/ready"];
const SESSION_COOKIE = "rahmet_session";

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const id = request.headers.get("x-request-id")?.slice(0, 100) || randomUUID();
  requestHeaders.set("x-request-id", id);
  const path = request.nextUrl.pathname;
  const publicRoute = publicPaths.includes(path) || path.startsWith("/api/integrations/google-forms/");
  if (!publicRoute && !request.cookies.has(SESSION_COOKIE)) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.headers.set("x-request-id", id);
    return response;
  }
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", id);
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
