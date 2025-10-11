import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(_scrypt);

export async function hashPassword(password: string, salt?: string): Promise<string> {
  const resolvedSalt = salt ?? randomBytes(16).toString("hex");
  const derived = (await scrypt(password, resolvedSalt, 64)) as Buffer;
  return `${resolvedSalt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(":");
  if (!salt || !key) {
    return false;
  }

  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const keyBuffer = Buffer.from(key, "hex");

  if (keyBuffer.length !== derived.length) {
    return false;
  }

  return timingSafeEqual(derived, keyBuffer);
}
