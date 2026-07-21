import type {
  AuthSessionInfo,
  AuthUser,
  CreateAccountRecord,
  CreateAccountResult,
  StoredPasswordCredential,
  UpdateProfileInput,
} from "./auth.contracts.js";

export abstract class AuthStore {
  abstract createAccount(input: CreateAccountRecord): Promise<CreateAccountResult>;
  abstract findPasswordCredential(email: string): Promise<StoredPasswordCredential | null>;
  abstract createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  abstract findSession(tokenHash: string, now: Date): Promise<AuthSessionInfo | null>;
  abstract updateProfile(userId: string, input: UpdateProfileInput): Promise<AuthUser | null>;
  abstract revokeSession(tokenHash: string, revokedAt: Date): Promise<void>;
}
