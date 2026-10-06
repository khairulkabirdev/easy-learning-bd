import "server-only";

import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

import { z } from "zod";

const MAX_FILE_SIZE = 4.8 * 1024 * 1024;

const allowedMimeTypes = new Map<string, string>([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
  ["image/jpg", ".jpg"],
]);

const uploadDomainSchema = z.enum(["classes", "subjects", "units", "lessons", "topics", "profiles"]);

const publicRoot = path.join(process.cwd(), "public");
const uploadsRoot = path.join(publicRoot, "uploads");
const tempRoot = path.join(uploadsRoot, "temp");

const TEMP_FILE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
let lastTempPruneAt = 0;

async function pruneOldTempUploads() {
  const now = Date.now();
  if (now - lastTempPruneAt < 60 * 60 * 1000) return;
  lastTempPruneAt = now;

  let entries: import("fs").Dirent[];
  try {
    entries = await fs.readdir(tempRoot, { withFileTypes: true });
  } catch {
    return;
  }

  await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const filePath = path.join(tempRoot, entry.name);
        try {
          assertNoPathTraversal(filePath, tempRoot);
          const stat = await fs.stat(filePath);
          if (now - stat.mtimeMs > TEMP_FILE_MAX_AGE_MS) await fs.unlink(filePath);
        } catch {
          // Best-effort cleanup must never break a new upload.
        }
      }),
  );
}

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
  const relative = path.relative(resolvedRoot, resolvedTarget);

  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    return;
  }

  throw new Error("Invalid upload target path.");
}

function detectImageExtension(buffer: Buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return ".png";
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return ".jpg";
  }

  if (buffer.length >= 6) {
    const signature = buffer.subarray(0, 6).toString("ascii");
    if (signature === "GIF87a" || signature === "GIF89a") return ".gif";
  }

  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return ".webp";
  }

  return null;
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

  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Image must be 4.8 MB or smaller.");
  }

  const declaredExtension = allowedMimeTypes.get(file.type.toLowerCase());
  if (!declaredExtension) {
    throw new Error("Only PNG, JPG, JPEG, WEBP, and GIF files are allowed.");
  }

  const buffer = await fileToBuffer(file);
  const detectedExtension = detectImageExtension(buffer);
  if (!detectedExtension) {
    throw new Error("The uploaded file is not a valid supported image.");
  }

  if (declaredExtension !== detectedExtension) {
    throw new Error("Image file type does not match its contents.");
  }

  await ensureDir(tempRoot);
  await pruneOldTempUploads();

  const filename = `${crypto.randomUUID()}${detectedExtension}`;
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
