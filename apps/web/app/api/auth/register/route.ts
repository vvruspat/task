import { NextResponse } from "next/server";
import { createBackendSession, sessionCookieName } from "../../../../lib/auth";

export async function POST(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json().catch((): null => null);
  const result = await createBackendSession("/auth/register", body);
  if ("error" in result)
    return NextResponse.json({ error: result.error }, { status: result.status });
  const response = NextResponse.json({ user: result.session.user }, { status: 201 });
  response.cookies.set(
    sessionCookieName,
    result.session.token,
    cookieOptions(result.session.expiresAt),
  );
  return response;
}

function cookieOptions(expiresAt: string): {
  expires: Date;
  httpOnly: true;
  path: "/";
  sameSite: "lax";
  secure: boolean;
} {
  return {
    expires: new Date(expiresAt),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
  };
}
