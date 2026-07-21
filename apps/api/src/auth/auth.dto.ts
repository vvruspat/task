import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import type {
  AuthSession,
  AuthSessionInfo,
  AuthUser,
  LoginInput,
  RegisterInput,
  SupportedLocale,
  UpdateProfileInput,
} from "./auth.contracts.js";

const maxEmailLength = 320;
const maxDisplayNameLength = 100;
const minPasswordLength = 8;
const maxPasswordLength = 128;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export class RegisterDto implements RegisterInput {
  @ApiProperty({ example: "Alex", maxLength: maxDisplayNameLength, type: String })
  readonly displayName = "";

  @ApiProperty({
    example: "alex@example.com",
    format: "email",
    maxLength: maxEmailLength,
    type: String,
  })
  readonly email = "";

  @ApiProperty({
    format: "password",
    minLength: minPasswordLength,
    maxLength: maxPasswordLength,
    type: String,
  })
  readonly password = "";
}

export class LoginDto implements LoginInput {
  @ApiProperty({
    example: "alex@example.com",
    format: "email",
    maxLength: maxEmailLength,
    type: String,
  })
  readonly email = "";

  @ApiProperty({
    format: "password",
    minLength: minPasswordLength,
    maxLength: maxPasswordLength,
    type: String,
  })
  readonly password = "";
}

export class UpdateProfileDto implements UpdateProfileInput {
  @ApiProperty({ maxLength: maxDisplayNameLength, type: String })
  readonly displayName = "";

  @ApiProperty({ enum: ["en", "ru"], nullable: true, type: String })
  readonly locale: SupportedLocale | null = null;
}

export class ParseRegisterBodyPipe implements PipeTransform<unknown, RegisterInput> {
  transform(value: unknown): RegisterInput {
    const input = readRecord(value, "Registration payload must be an object.");
    return {
      displayName: readDisplayName(input["displayName"]),
      email: readEmail(input["email"]),
      password: readPassword(input["password"]),
    };
  }
}

export class ParseLoginBodyPipe implements PipeTransform<unknown, LoginInput> {
  transform(value: unknown): LoginInput {
    const input = readRecord(value, "Login payload must be an object.");
    return { email: readEmail(input["email"]), password: readPassword(input["password"]) };
  }
}

export class ParseUpdateProfileBodyPipe implements PipeTransform<unknown, UpdateProfileInput> {
  transform(value: unknown): UpdateProfileInput {
    const input = readRecord(value, "Profile payload must be an object.");
    return {
      displayName: readDisplayName(input["displayName"]),
      locale: readLocale(input["locale"]),
    };
  }
}

export class AuthUserDto implements AuthUser {
  @ApiProperty({ format: "uuid" })
  readonly id: string;

  @ApiProperty()
  readonly displayName: string;

  @ApiProperty({ format: "email" })
  readonly email: string;

  @ApiProperty({ enum: ["en", "ru"], nullable: true, type: String })
  readonly locale: SupportedLocale | null;

  constructor(user: AuthUser) {
    this.id = user.id;
    this.displayName = user.displayName;
    this.email = user.email;
    this.locale = user.locale;
  }
}

export class AuthSessionDto implements AuthSession {
  @ApiProperty({ description: "Opaque bearer token. Store it only in a secure HttpOnly cookie." })
  readonly token: string;

  @ApiProperty({ format: "date-time" })
  readonly expiresAt: Date;

  @ApiProperty({ type: AuthUserDto })
  readonly user: AuthUserDto;

  constructor(session: AuthSession) {
    this.token = session.token;
    this.expiresAt = session.expiresAt;
    this.user = new AuthUserDto(session.user);
  }
}

export class AuthSessionInfoDto implements AuthSessionInfo {
  @ApiProperty({ format: "date-time" })
  readonly expiresAt: Date;

  @ApiProperty({ type: AuthUserDto })
  readonly user: AuthUserDto;

  constructor(session: AuthSessionInfo) {
    this.expiresAt = session.expiresAt;
    this.user = new AuthUserDto(session.user);
  }
}

function readRecord(value: unknown, message: string): Record<string, unknown> {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException(message);
  }
  return value;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readDisplayName(value: unknown): string {
  if (typeof value !== "string") throw new BadRequestException("Display name is required.");
  const normalized = value.trim().replace(/\s+/gu, " ");
  if (normalized.length === 0 || normalized.length > maxDisplayNameLength) {
    throw new BadRequestException(`Display name must be 1-${maxDisplayNameLength} characters.`);
  }
  return normalized;
}

function readEmail(value: unknown): string {
  if (typeof value !== "string") throw new BadRequestException("Email is required.");
  const normalized = value.trim().toLowerCase();
  if (
    normalized.length === 0 ||
    normalized.length > maxEmailLength ||
    !emailPattern.test(normalized)
  ) {
    throw new BadRequestException("Email address is invalid.");
  }
  return normalized;
}

function readPassword(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < minPasswordLength ||
    value.length > maxPasswordLength
  ) {
    throw new BadRequestException(
      `Password must be ${minPasswordLength}-${maxPasswordLength} characters.`,
    );
  }
  return value;
}

function readLocale(value: unknown): SupportedLocale | null {
  if (value === null || value === "en" || value === "ru") return value;
  throw new BadRequestException("Locale must be en, ru, or null.");
}
