import { NextResponse } from "next/server";
import { apiBaseUrl, readSessionToken, sessionCookieName } from "../../../../lib/auth";
import { localeCookieName } from "../../../../lib/i18n/locale";

export async function POST(request: Request): Promise<NextResponse> {
  const token = readSessionToken(request);
  if (token !== null) {
    await fetch(`${apiBaseUrl()}/auth/logout`, {
      headers: { authorization: `Bearer ${token}` },
      method: "POST",
      cache: "no-store",
    }).catch((): undefined => undefined);
  }
  const response = NextResponse.json({ success: true });
  response.cookies.set(sessionCookieName, "", { expires: new Date(0), httpOnly: true, path: "/" });
  response.cookies.set(localeCookieName, "", { expires: new Date(0), path: "/" });
  return response;
}
