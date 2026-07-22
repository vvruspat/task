import assert from "node:assert/strict";
import test from "node:test";
import {
  authPageHref,
  clearInvitationToken,
  invitationEmail,
  invitationPath,
  postAuthPath,
  rememberInvitationToken,
  type SessionStorageLike,
} from "./invite-auth.ts";

const token = "a".repeat(43);

test("invitation tokens survive authentication in session storage", () => {
  const storage = createStorage();

  assert.equal(rememberInvitationToken(storage, token), true);
  assert.equal(postAuthPath("?next=/agent", storage), `/invite/${token}`);
  clearInvitationToken(storage);
  assert.equal(postAuthPath("?next=/projects", storage), "/projects");
});

test("invite authentication helpers reject unsafe redirects and malformed tokens", () => {
  const storage = createStorage();

  assert.equal(invitationPath("short"), null);
  assert.equal(rememberInvitationToken(storage, "short"), false);
  assert.equal(postAuthPath("?next=//example.com", storage), "/agent");
  assert.equal(
    authPageHref("register", { email: " invited@example.com ", next: `/invite/${token}` }),
    `/register?next=%2Finvite%2F${token}&email=invited%40example.com`,
  );
  assert.equal(invitationEmail("?email=invited%40example.com"), "invited@example.com");
});

function createStorage(): SessionStorageLike {
  const values = new Map<string, string>();
  return {
    getItem: (key): string | null => values.get(key) ?? null,
    removeItem: (key): void => {
      values.delete(key);
    },
    setItem: (key, value): void => {
      values.set(key, value);
    },
  };
}
