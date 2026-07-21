export type RegisterInput = {
  displayName: string;
  email: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type SupportedLocale = "en" | "ru";

export type UpdateProfileInput = {
  displayName: string;
  locale: SupportedLocale | null;
};

export type AuthUser = {
  id: string;
  displayName: string;
  email: string;
  locale: SupportedLocale | null;
};

export type AuthSession = {
  token: string;
  expiresAt: Date;
  user: AuthUser;
};

export type AuthSessionInfo = Omit<AuthSession, "token">;

export type StoredPasswordCredential = {
  passwordHash: string;
  user: AuthUser;
};

export type CreateAccountRecord = RegisterInput & {
  passwordHash: string;
  sessionExpiresAt: Date;
  sessionTokenHash: string;
  workspaceSlug: string;
};

export type CreateAccountResult = { status: "email_taken" } | { status: "created"; user: AuthUser };
