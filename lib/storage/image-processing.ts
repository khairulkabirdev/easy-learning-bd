import "server-only";

import crypto from "node:crypto";
import path from "node:path";

import imageType from "image-type";
import sharp from "sharp";

export const MAX_MANAGED_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_INPUT_PIXELS = 25_000_000;
const MAX_OUTPUT_DIMENSION = 2000;
const WEBP_QUALITY = 82;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type ProcessedImage = {
  buffer: Buffer;
  originalName: string;
  sourceMimeType: string;
  mimeType: "image/webp";
  extension: "webp";
  sizeBytes: number;
  width: number;
  height: number;
  checksumSha256: string;
};

export async function optimizeImageFile(file: File): Promise<ProcessedImage> {
  if (!(file instanceof File)) throw new Error("Image file is required.");
  if (file.size <= 0 || file.size > MAX_MANAGED_IMAGE_BYTES) {
    throw new Error("Image must be greater than 0 bytes and no larger than 5 MB.");
  }

  const declaredMime = file.type.toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(declaredMime)) {
    throw new Error("Only JPEG, PNG, and WebP images are allowed.");
  }

  const input = new Uint8Array(await file.arrayBuffer());
  const detected = await imageType(input);
  if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime) || detected.mime !== declaredMime) {
    throw new Error("The uploaded file type does not match its image contents.");
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
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    output = processed.data;
    width = processed.info.width ?? 0;
    height = processed.info.height ?? 0;
  } catch {
    throw new Error("The uploaded image could not be decoded safely.");
  }

  const originalName = path.basename(file.name || "upload")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .slice(0, 255);

  return {
    buffer: output,
    originalName,
    sourceMimeType: detected.mime,
    mimeType: "image/webp",
    extension: "webp",
    sizeBytes: output.length,
    width,
    height,
    checksumSha256: crypto.createHash("sha256").update(output).digest("hex"),
  };
}
