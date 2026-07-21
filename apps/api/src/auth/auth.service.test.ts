import assert from "node:assert/strict";
import test from "node:test";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import type {
  AuthSessionInfo,
  AuthUser,
  CreateAccountRecord,
  CreateAccountResult,
  StoredPasswordCredential,
  UpdateProfileInput,
} from "./auth.contracts.js";
import { AuthService, hashSessionToken, readBearerToken } from "./auth.service.js";
import { AuthStore } from "./auth.store.js";
import { hashPassword } from "./password.js";

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  displayName: "Alex",
  email: "alex@example.com",
  locale: null,
};

test("AuthService registers an account with a hashed password and durable session", async () => {
  const store = new RecordingAuthStore();
  const now = new Date("2026-07-20T10:00:00.000Z");
  const session = await new AuthService(store).register(
    { displayName: user.displayName, email: user.email, password: "password123" },
    now,
  );
  assert.equal(session.user.email, user.email);
  assert.equal(session.expiresAt.getTime() > now.getTime(), true);
  assert.notEqual(store.account?.passwordHash, "password123");
  assert.equal(store.account?.sessionTokenHash, hashSessionToken(session.token));
});

test("AuthService rejects duplicate registration and invalid login", async () => {
  const store = new RecordingAuthStore();
  store.emailTaken = true;
  await assert.rejects(
    new AuthService(store).register({
      displayName: "Alex",
      email: user.email,
      password: "password123",
    }),
    ConflictException,
  );
  store.emailTaken = false;
  store.credential = { passwordHash: await hashPassword("correct-password"), user };
  await assert.rejects(
    new AuthService(store).login({ email: user.email, password: "wrong-password" }),
    UnauthorizedException,
  );
});

test("readBearerToken validates opaque session authorization", () => {
  const token = "a".repeat(43);
  assert.equal(readBearerToken(`Bearer ${token}`), token);
  assert.throws(() => readBearerToken(undefined), UnauthorizedException);
  assert.throws(() => readBearerToken("Bearer short"), UnauthorizedException);
});

test("AuthService updates the authenticated user's profile", async () => {
  const store = new RecordingAuthStore();
  store.session = { expiresAt: new Date("2026-08-20T10:00:00.000Z"), user };
  const updated = await new AuthService(store).updateProfile("session-token", {
    displayName: "Алекс",
    locale: "ru",
  });
  assert.equal(updated.displayName, "Алекс");
  assert.equal(updated.locale, "ru");
});

class RecordingAuthStore extends AuthStore {
  account: CreateAccountRecord | null = null;
  credential: StoredPasswordCredential | null = null;
  emailTaken = false;
  session: AuthSessionInfo | null = null;

  async createAccount(input: CreateAccountRecord): Promise<CreateAccountResult> {
    this.account = input;
    return this.emailTaken ? { status: "email_taken" } : { status: "created", user };
  }

  async findPasswordCredential(): Promise<StoredPasswordCredential | null> {
    return this.credential;
  }

  async createSession(): Promise<void> {}

  async findSession(): Promise<AuthSessionInfo | null> {
    return this.session;
  }

  async updateProfile(_userId: string, input: UpdateProfileInput): Promise<AuthUser> {
    return { ...user, displayName: input.displayName, locale: input.locale };
  }

  async revokeSession(): Promise<void> {}
}
