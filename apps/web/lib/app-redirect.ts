/** Keep browser redirects on the public origin even behind a reverse proxy. */
export function createAppRedirect(path: string): Response {
  if (!path.startsWith("/") || path.startsWith("//") || /[\\\r\n]/u.test(path)) {
    throw new Error("Redirect destination must be an application-relative path.");
  }
  return new Response(null, {
    headers: { "cache-control": "no-store", location: path },
    status: 303,
  });
}
