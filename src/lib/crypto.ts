import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;

/**
 * Derive a 256-bit key from the configured secret using scrypt.
 */
function deriveKey(salt: Buffer): Buffer {
  const secret = process.env.ENCRYPTION_KEY || "dev-only-insecure-key-min-32-chars!!";
  return scryptSync(secret, salt, 32);
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a hex string containing: salt (32B) + iv (16B) + authTag (16B) + ciphertext.
 */
export function encrypt(plaintext: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(salt);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, tag, Buffer.from(encrypted, "hex")]).toString("hex");
}

/**
 * Decrypt an encrypted hex string produced by `encrypt()`.
 * Throws on invalid key or corrupted data.
 */
export function decrypt(encryptedHex: string): string {
  const buf = Buffer.from(encryptedHex, "hex");
  const salt = buf.subarray(0, SALT_LENGTH);
  const iv = buf.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = buf.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const ciphertext = buf.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  const key = deriveKey(salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}

/**
 * Mask an API key for display: first 8 chars + "..." + last 4 chars.
 */
export function maskKey(key: string): string {
  if (key.length <= 12) return "****";
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

export function sanitizeForLog(input: string): string {
  return input.replace(/[\r\n\t]/g, "_").slice(0, 200);
}

export function generateKeyPrefix(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
