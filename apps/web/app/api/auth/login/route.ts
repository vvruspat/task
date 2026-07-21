import { NextResponse } from "next/server";
import { createBackendSession, sessionCookieName } from "../../../../lib/auth";

export async function POST(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json().catch((): null => null);
  const result = await createBackendSession("/auth/login", body);
  if ("error" in result)
    return NextResponse.json({ error: result.error }, { status: result.status });
  const response = NextResponse.json({ user: result.session.user });
  response.cookies.set(sessionCookieName, result.session.token, {
    expires: new Date(result.session.expiresAt),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
  });
  return response;
}
