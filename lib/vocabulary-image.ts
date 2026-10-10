import "server-only";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import imageType from "image-type";
import sharp from "sharp";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_INPUT_PIXELS = 25_000_000;
const MAX_OUTPUT_DIMENSION = 2000;
const WEBP_QUALITY = 82;

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const publicRoot = path.join(process.cwd(), "public");
const vocabularyImageRoot = path.join(publicRoot, "uploads", "vocabulary");

function assertInsideVocabularyRoot(targetPath: string) {
  const resolvedRoot = path.resolve(vocabularyImageRoot);
  const resolvedTarget = path.resolve(targetPath);
  const relative = path.relative(resolvedRoot, resolvedTarget);

  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    return;
  }

  throw new Error("Invalid vocabulary image path.");
}

function toPublicUrl(filePath: string) {
  return `/${path.relative(publicRoot, filePath).replace(/\\/g, "/")}`;
}

function toStoragePath(filePath: string) {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

export function isManagedVocabularyImageUrl(value: string | null | undefined) {
  return Boolean(value && /^\/uploads\/vocabulary\/[A-Za-z0-9-]+\.webp$/i.test(value));
}

export function isManagedVocabularyImagePath(value: string | null | undefined) {
  return Boolean(value && /^public\/uploads\/vocabulary\/[A-Za-z0-9-]+\.webp$/i.test(value));
}

function resolveStoredVocabularyImagePath(value: string) {
  if (isManagedVocabularyImagePath(value)) {
    const absolutePath = path.join(process.cwd(), value);
    assertInsideVocabularyRoot(absolutePath);
    return absolutePath;
  }

  // Backward compatibility for records created by the first image-upload
  // implementation, where imagePath contained the public URL.
  if (isManagedVocabularyImageUrl(value)) {
    const absolutePath = path.join(publicRoot, value.replace(/^\/+/, ""));
    assertInsideVocabularyRoot(absolutePath);
    return absolutePath;
  }

  return null;
}

export async function optimizeAndStoreVocabularyImage(file: File) {
  if (!(file instanceof File)) {
    throw new Error("Image file is required.");
  }

  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  const declaredMime = file.type.toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(declaredMime)) {
    throw new Error("Only JPEG, PNG, and WebP images are allowed.");
  }

  const input = new Uint8Array(await file.arrayBuffer());
  const detected = await imageType(input);

  if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
    throw new Error("The uploaded file is not a supported image.");
  }

  if (detected.mime !== declaredMime) {
    throw new Error("Image file type does not match its contents.");
  }

  let output: Buffer;
  let width = 0;
  let height = 0;
  try {
    const processed = await sharp(input, {
      limitInputPixels: MAX_INPUT_PIXELS,
      limitInputChannels: 4,
      sequentialRead: true,
      failOn: "error",
    })
      .rotate()
      .resize({
        width: MAX_OUTPUT_DIMENSION,
        height: MAX_OUTPUT_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: WEBP_QUALITY,
        effort: 4,
      })
      .toBuffer({ resolveWithObject: true });

    output = processed.data;
    width = processed.info.width ?? 0;
    height = processed.info.height ?? 0;
  } catch {
    throw new Error("The uploaded image could not be decoded safely.");
  }

  await fs.mkdir(vocabularyImageRoot, { recursive: true });
  const outputPath = path.join(vocabularyImageRoot, `${crypto.randomUUID()}.webp`);
  assertInsideVocabularyRoot(outputPath);
  await fs.writeFile(outputPath, output, { flag: "wx" });

  const originalName = path.basename(file.name || "upload").replace(/[\u0000-\u001F\u007F]/g, "").slice(0, 255);

  return {
    imageUrl: toPublicUrl(outputPath),
    imagePath: toStoragePath(outputPath),
    originalName,
    sourceMimeType: detected.mime,
    mime: "image/webp" as const,
    extension: "webp" as const,
    size: output.length,
    width,
    height,
    checksumSha256: crypto.createHash("sha256").update(output).digest("hex"),
  };
}

export async function deleteVocabularyImage(storagePathOrLegacyUrl: string | null | undefined) {
  if (!storagePathOrLegacyUrl) return;

  const absolutePath = resolveStoredVocabularyImagePath(storagePathOrLegacyUrl);
  if (!absolutePath) return;

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
