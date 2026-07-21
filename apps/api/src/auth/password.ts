import { scrypt as nodeScrypt, randomBytes, timingSafeEqual } from "node:crypto";

const keyLength = 64;
const saltLength = 16;
const scryptCost = 16_384;
const scryptBlockSize = 8;
const scryptParallelization = 1;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(saltLength);
  const derivedKey = await deriveKey(
    password,
    salt,
    scryptCost,
    scryptBlockSize,
    scryptParallelization,
  );
  return [
    "scrypt",
    String(scryptCost),
    String(scryptBlockSize),
    String(scryptParallelization),
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const parts = encodedHash.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const cost = Number(parts[1]);
  const blockSize = Number(parts[2]);
  const parallelization = Number(parts[3]);
  const saltText = parts[4];
  const hashText = parts[5];
  if (
    !Number.isInteger(cost) ||
    cost !== scryptCost ||
    !Number.isInteger(blockSize) ||
    blockSize !== scryptBlockSize ||
    !Number.isInteger(parallelization) ||
    parallelization !== scryptParallelization ||
    saltText === undefined ||
    hashText === undefined
  )
    return false;
  const expected = Buffer.from(hashText, "base64url");
  if (expected.length !== keyLength) return false;
  const actual = await deriveKey(
    password,
    Buffer.from(saltText, "base64url"),
    cost,
    blockSize,
    parallelization,
  );
  return timingSafeEqual(actual, expected);
}

function deriveKey(
  password: string,
  salt: Buffer,
  N: number,
  r: number,
  p: number,
): Promise<Buffer> {
  return new Promise((resolve, reject): void => {
    nodeScrypt(password, salt, keyLength, { N, r, p }, (error, derivedKey): void => {
      if (error !== null) reject(error);
      else resolve(derivedKey);
    });
  });
}
