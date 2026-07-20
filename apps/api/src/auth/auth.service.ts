import { createHash, randomBytes } from "node:crypto";
import { ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { AuthSession, AuthSessionInfo, LoginInput, RegisterInput } from "./auth.contracts.js";
import { AuthStore } from "./auth.store.js";
import { hashPassword, verifyPassword } from "./password.js";

const sessionLifetimeMilliseconds = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(@Inject(AuthStore) private readonly store: AuthStore) {}

  async register(input: RegisterInput, now = new Date()): Promise<AuthSession> {
    const token = createSessionToken();
    const expiresAt = new Date(now.getTime() + sessionLifetimeMilliseconds);
    const result = await this.store.createAccount({
      ...input,
      passwordHash: await hashPassword(input.password),
      sessionExpiresAt: expiresAt,
      sessionTokenHash: hashSessionToken(token),
      workspaceSlug: createWorkspaceSlug(input.email),
    });
    if (result.status === "email_taken") {
      throw new ConflictException("An account with this email already exists.");
    }
    return { token, expiresAt, user: result.user };
  }

  async login(input: LoginInput, now = new Date()): Promise<AuthSession> {
    const credential = await this.store.findPasswordCredential(input.email);
    if (credential === null) {
      await hashPassword(input.password);
      throw new UnauthorizedException("Email or password is incorrect.");
    }
    if (!(await verifyPassword(input.password, credential.passwordHash))) {
      throw new UnauthorizedException("Email or password is incorrect.");
    }
    const token = createSessionToken();
    const expiresAt = new Date(now.getTime() + sessionLifetimeMilliseconds);
    await this.store.createSession(credential.user.id, hashSessionToken(token), expiresAt);
    return { token, expiresAt, user: credential.user };
  }

  async getSession(token: string, now = new Date()): Promise<AuthSessionInfo> {
    const session = await this.store.findSession(hashSessionToken(token), now);
    if (session === null) throw new UnauthorizedException("Session is invalid or expired.");
    return session;
  }

  async logout(token: string, now = new Date()): Promise<void> {
    await this.store.revokeSession(hashSessionToken(token), now);
  }
}

export function readBearerToken(authorization: string | string[] | undefined): string {
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) {
    throw new UnauthorizedException("Bearer session token is required.");
  }
  const token = authorization.slice("Bearer ".length);
  if (!/^[A-Za-z0-9_-]{43}$/u.test(token)) {
    throw new UnauthorizedException("Bearer session token is invalid.");
  }
  return token;
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

function createWorkspaceSlug(email: string): string {
  const base = email
    .split("@", 1)[0]
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 32);
  return `${base?.length ? base : "workspace"}-${randomBytes(4).toString("hex")}`;
}
