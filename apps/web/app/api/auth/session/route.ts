import { NextResponse } from "next/server";
import { resolveSession } from "../../../../lib/auth";

export async function GET(request: Request): Promise<NextResponse> {
  const session = await resolveSession(request);
  return session === null
    ? NextResponse.json({ error: "unauthorized" }, { status: 401 })
    : NextResponse.json(session);
}
