import "server-only";

import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

import { z } from "zod";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const allowedMimeTypes = new Map<string, string>([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

const uploadDomainSchema = z.enum(["classes", "subjects", "units", "lessons", "topics"]);

const publicRoot = path.join(process.cwd(), "public");
const uploadsRoot = path.join(publicRoot, "uploads");
const tempRoot = path.join(uploadsRoot, "temp");

function normalizePublicPath(filePath: string) {
  return `/${path.relative(publicRoot, filePath).replace(/\\/g, "/")}`;
}

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function fileToBuffer(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function assertNoPathTraversal(targetPath: string, allowedRoot: string) {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedRoot = path.resolve(allowedRoot);

  if (!resolvedTarget.startsWith(resolvedRoot)) {
    throw new Error("Invalid upload target path.");
  }
}

export function parseExternalImageUrl(value: string) {
  if (!value.trim()) return "";

  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https image URLs are allowed.");
  }

  return value.trim();
}

export async function saveImageToTemp(file: File) {
  if (!file) {
    throw new Error("File is required.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  const extension = allowedMimeTypes.get(file.type);
  if (!extension) {
    throw new Error("Only PNG, JPG, JPEG, WEBP, and GIF files are allowed.");
  }

  const buffer = await fileToBuffer(file);

  await ensureDir(tempRoot);

  const filename = `${crypto.randomUUID()}${extension}`;
  const tempPath = path.join(tempRoot, filename);

  assertNoPathTraversal(tempPath, tempRoot);
  await fs.writeFile(tempPath, buffer);

  return {
    tempPath,
    publicPath: normalizePublicPath(tempPath),
    filename,
  };
}

export async function moveTempImageToDomain(params: {
  tempPublicPath: string;
  domain: z.infer<typeof uploadDomainSchema>;
}) {
  const parsed = uploadDomainSchema.parse(params.domain);

  const relativePath = params.tempPublicPath.replace(/^\/+/, "");
  const sourcePath = path.join(publicRoot, relativePath);
  assertNoPathTraversal(sourcePath, tempRoot);

  const extension = path.extname(sourcePath);
  const domainRoot = path.join(uploadsRoot, parsed);
  await ensureDir(domainRoot);

  const finalPath = path.join(domainRoot, `${crypto.randomUUID()}${extension}`);
  assertNoPathTraversal(finalPath, domainRoot);

  await fs.rename(sourcePath, finalPath);

  return normalizePublicPath(finalPath);
}

export async function deleteLocalImage(publicPathValue: string | null | undefined) {
  if (!publicPathValue) return;
  if (/^https?:\/\//i.test(publicPathValue)) return;

  const relativePath = publicPathValue.replace(/^\/+/, "");
  const absolutePath = path.join(publicRoot, relativePath);
  assertNoPathTraversal(absolutePath, uploadsRoot);

  try {
    await fs.unlink(absolutePath);
  } catch {
    // ignore missing file
  }
}

export async function replaceDomainImage(params: {
  previousImagePath?: string | null;
  nextTempPublicPath?: string | null;
  nextExternalUrl?: string | null;
  domain: z.infer<typeof uploadDomainSchema>;
}) {
  const externalUrl = params.nextExternalUrl?.trim() ? parseExternalImageUrl(params.nextExternalUrl) : "";
  let finalImagePath = params.previousImagePath || "";

  if (externalUrl) {
    if (params.previousImagePath && params.previousImagePath !== externalUrl) {
      await deleteLocalImage(params.previousImagePath);
    }
    return externalUrl;
  }

  if (params.nextTempPublicPath?.trim()) {
    const moved = await moveTempImageToDomain({
      tempPublicPath: params.nextTempPublicPath,
      domain: params.domain,
    });

    if (params.previousImagePath && params.previousImagePath !== moved) {
      await deleteLocalImage(params.previousImagePath);
    }

    finalImagePath = moved;
  }

  return finalImagePath;
}
