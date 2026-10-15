import "server-only";

import crypto from "node:crypto";

const VERSION = "v1";

function getEncryptionKey() {
  const source = process.env.STORAGE_ENCRYPTION_KEY;
  if (!source || !/^[a-f0-9]{64}$/i.test(source)) {
    throw new Error("Storage credential encryption is not configured. Set STORAGE_ENCRYPTION_KEY to a stable 64-character hexadecimal key generated from 32 random bytes.");
  }

  return Buffer.from(
    crypto.hkdfSync(
      "sha256",
      Buffer.from(source, "hex"),
      Buffer.from("easy-learning-bd-storage", "utf8"),
      Buffer.from("storage-configuration-aes-256-gcm-v1", "utf8"),
      32,
    ),
  );
}

export function encryptStorageSecret(value: string) {
  if (!value) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptStorageSecret(value: string) {
  if (!value) return "";
  const [version, ivText, tagText, ciphertextText] = value.split(".");
  if (version !== VERSION || !ivText || !tagText || !ciphertextText) {
    throw new Error("Stored storage credentials cannot be decrypted. Check STORAGE_ENCRYPTION_KEY.");
  }

  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      getEncryptionKey(),
      Buffer.from(ivText, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagText, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextText, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error("Stored storage credentials cannot be decrypted. Check STORAGE_ENCRYPTION_KEY.");
  }
}

export function hasValidStorageEncryptionKey() {
  return /^[a-f0-9]{64}$/i.test(process.env.STORAGE_ENCRYPTION_KEY || "");
}
