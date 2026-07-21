import type { AuthUser } from "@task/api-client";
import { NextResponse } from "next/server";
import { apiBaseUrl, readSessionToken } from "../../../../lib/auth";
import { localeCookieName } from "../../../../lib/i18n/locale";

export async function PATCH(request: Request): Promise<NextResponse> {
  const token = readSessionToken(request);
  if (token === null) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body: unknown = await request.json().catch((): null => null);
  const response = await fetch(`${apiBaseUrl()}/auth/profile`, {
    body: JSON.stringify(body),
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    method: "PATCH",
    cache: "no-store",
  });
  const responseBody: unknown = await response.json().catch((): null => null);
  if (!response.ok || !isAuthUser(responseBody)) {
    return NextResponse.json({ error: "profile_update_failed" }, { status: response.status });
  }
  const result = NextResponse.json(responseBody);
  result.cookies.set(localeCookieName, responseBody.locale ?? "system", {
    maxAge: 31_536_000,
    path: "/",
    sameSite: "lax",
  });
  return result;
}

function isAuthUser(value: unknown): value is AuthUser {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "displayName" in value &&
    typeof value.displayName === "string" &&
    "email" in value &&
    typeof value.email === "string" &&
    "locale" in value &&
    (value.locale === null || value.locale === "en" || value.locale === "ru")
  );
}
