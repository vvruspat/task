import { type NextRequest, NextResponse } from "next/server";
import {
  authenticatedUserIdHeader,
  resolveSession,
  sessionCookieName,
  workspaceRequestPathHeader,
} from "./lib/auth";
import { isPublicRequest } from "./lib/public-route";

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/agent", request.url));
  }
  const session = await resolveSession(request);
  const isPublic = isPublicRequest(pathname, request.method);

  if (session === null) {
    if (isPublic) return NextResponse.next();
    if (pathname.startsWith("/api/")) {
      const response = NextResponse.json({ error: "Authentication is required." }, { status: 401 });
      if (request.cookies.has(sessionCookieName)) response.cookies.delete(sessionCookieName);
      return response;
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    const response = NextResponse.redirect(loginUrl);
    if (request.cookies.has(sessionCookieName)) response.cookies.delete(sessionCookieName);
    return response;
  }

  if (pathname === "/login" || pathname === "/register") {
    return NextResponse.redirect(new URL("/agent", request.url));
  }

  const headers = new Headers(request.headers);
  headers.delete(authenticatedUserIdHeader);
  headers.delete(workspaceRequestPathHeader);
  headers.set(authenticatedUserIdHeader, session.user.id);
  headers.set(workspaceRequestPathHeader, `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
