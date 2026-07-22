export function isPublicRequest(pathname: string, method: string): boolean {
  if (pathname === "/login" || pathname === "/register") return true;
  if (pathname.startsWith("/invite/")) return true;
  if (pathname.startsWith("/api/auth/")) return true;
  return method === "GET" && /^\/api\/invitations\/[^/]+$/u.test(pathname);
}
