const invitationTokenStorageKey = "task:invitation-token";
const invitationTokenPattern = /^[A-Za-z0-9_-]{43}$/u;

export type SessionStorageLike = {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
};

export function invitationPath(token: string): string | null {
  return invitationTokenPattern.test(token) ? `/invite/${token}` : null;
}

export function rememberInvitationToken(storage: SessionStorageLike, token: string): boolean {
  if (invitationPath(token) === null) return false;
  storage.setItem(invitationTokenStorageKey, token);
  return true;
}

export function clearInvitationToken(storage: SessionStorageLike): void {
  storage.removeItem(invitationTokenStorageKey);
}

export function postAuthPath(search: string, storage: SessionStorageLike): string {
  const storedToken = storage.getItem(invitationTokenStorageKey);
  if (storedToken !== null) {
    const storedInvitationPath = invitationPath(storedToken);
    if (storedInvitationPath !== null) return storedInvitationPath;
    clearInvitationToken(storage);
  }

  const next = new URLSearchParams(search).get("next");
  return isSafeInternalPath(next) ? next : "/agent";
}

export function authPageHref(
  mode: "login" | "register",
  input: { email: string; next: string },
): string {
  const parameters = new URLSearchParams();
  if (isSafeInternalPath(input.next)) parameters.set("next", input.next);
  if (input.email.trim().length > 0) parameters.set("email", input.email.trim());
  const query = parameters.toString();
  return `/${mode}${query.length > 0 ? `?${query}` : ""}`;
}

export function invitationEmail(search: string): string {
  return new URLSearchParams(search).get("email")?.trim() ?? "";
}

function isSafeInternalPath(value: string | null): value is string {
  return value?.startsWith("/") === true && !value.startsWith("//");
}
