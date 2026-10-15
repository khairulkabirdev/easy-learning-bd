import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { saveImageToManagedTemp, deleteTemporaryImage, type UploadActor } from "@/lib/storage/upload-management";

const uploadDomainSchema = z.enum(["classes", "subjects", "units", "lessons", "topics", "profiles"]);
const publicRoot = path.resolve(process.cwd(), "public");
const uploadsRoot = path.resolve(publicRoot, "uploads");

export function parseExternalImageUrl(value: string) {
  if (!value.trim()) return "";
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Only valid http and https image URLs are allowed.");
  }
  return value.trim();
}

export async function saveImageToTemp(file: File, actor: UploadActor) {
  return saveImageToManagedTemp(file, actor);
}

function resolveLegacyLocalUpload(value: string) {
  if (!value.startsWith("/uploads/") || value.includes("..") || value.includes("\\") || value.includes("\0")) return null;
  const absolutePath = path.resolve(publicRoot, value.replace(/^\/+/, ""));
  const relative = path.relative(uploadsRoot, absolutePath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return absolutePath;
}

export async function deleteLocalImage(publicPathValue: string | null | undefined) {
  if (!publicPathValue || /^https?:\/\//i.test(publicPathValue) || publicPathValue.startsWith("/api/media/")) return;
  const absolutePath = resolveLegacyLocalUpload(publicPathValue);
  if (!absolutePath) return;
  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export async function deleteTemporaryImageUpload(value: string | null | undefined, actor: UploadActor) {
  await deleteTemporaryImage(value, actor);
}

export async function moveTempImageToDomain(params: {
  tempPublicPath: string;
  domain: z.infer<typeof uploadDomainSchema>;
}) {
  // New uploads are already stored privately and retain their managed media URL.
  // This compatibility helper only accepts the new private-media URL.
  uploadDomainSchema.parse(params.domain);
  if (params.tempPublicPath.startsWith("/api/media/")) return params.tempPublicPath;
  throw new Error("Legacy temporary image paths cannot be moved to private storage. Upload the image again.");
}

export async function replaceDomainImage(params: {
  previousImagePath?: string | null;
  nextTempPublicPath?: string | null;
  nextExternalUrl?: string | null;
  domain: z.infer<typeof uploadDomainSchema>;
}) {
  uploadDomainSchema.parse(params.domain);
  const externalUrl = params.nextExternalUrl?.trim() ? parseExternalImageUrl(params.nextExternalUrl) : "";
  if (externalUrl) return externalUrl;
  if (params.nextTempPublicPath?.startsWith("/api/media/")) return params.nextTempPublicPath;
  return params.previousImagePath || "";
}
