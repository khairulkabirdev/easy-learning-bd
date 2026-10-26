import crypto from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";

import { assertTrustedMutationOrigin, requireAdmin } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";
import { getActiveStorageConfiguration, resolveStorageConfiguration } from "@/lib/storage/configurations";
import { optimizeImageFile } from "@/lib/storage/image-processing";
import {
  listMediaLibraryItems,
  MEDIA_LIBRARY_OWNER_TYPE,
  MEDIA_LIBRARY_PAGE_SIZE,
  MEDIA_LIBRARY_PURPOSE,
  normalizeMediaLibraryCategory,
} from "@/lib/storage/media-library";
import { createStorageObjectKey, deleteStoredObject, putStoredObject } from "@/lib/storage/object-store";
import { prunePendingStorageDeletes } from "@/lib/storage/upload-management";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MB = 1024 * 1024;
const MAX_TOTAL_BYTES = 1024 * MB;
const MAX_FILES_PER_UPLOAD = 10;
const MAX_DOCUMENT_BYTES = 100 * MB;
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const GENERIC_FILE_TYPES: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  pdf: "application/pdf",
  txt: "text/plain; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip",
  glb: "model/gltf-binary",
  gltf: "model/gltf+json",
  obj: "text/plain; charset=utf-8",
  fbx: "application/octet-stream",
  stl: "model/stl",
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function sanitizeFileName(value: string) {
  const cleaned = path.basename(value || "upload")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 255);
  return cleaned || "upload";
}

function fileLimitBytes(file: File, limits: { maxImageSizeMb: number; maxVideoSizeMb: number; maxModelSizeMb: number }) {
  const extension = path.extname(file.name || "").slice(1).toLowerCase();
  const declaredMime = file.type.toLowerCase();
  if (IMAGE_MIME_TYPES.has(declaredMime)) return limits.maxImageSizeMb * MB;
  if (declaredMime.startsWith("video/") || ["mp4", "webm", "mov"].includes(extension)) return limits.maxVideoSizeMb * MB;
  if (["glb", "gltf", "obj", "fbx", "stl"].includes(extension)) return limits.maxModelSizeMb * MB;
  return MAX_DOCUMENT_BYTES;
}

function buildPublicObjectUrl(baseUrl: string, objectKey: string) {
  const base = baseUrl.trim().replace(/\/+$/, "");
  return base ? `${base}/${objectKey}` : "";
}

async function prepareUpload(
  file: File,
  limits: { maxImageSizeMb: number; maxVideoSizeMb: number; maxModelSizeMb: number },
) {
  if (!(file instanceof File) || file.size <= 0) throw new Error("Choose a non-empty file.");
  const maxBytes = fileLimitBytes(file, limits);
  if (file.size > maxBytes) {
    throw new Error(`${file.name || "File"} is larger than the configured ${Math.floor(maxBytes / MB)} MB limit.`);
  }

  const declaredMime = file.type.toLowerCase();
  if (IMAGE_MIME_TYPES.has(declaredMime)) {
    const optimized = await optimizeImageFile(file, { maxInputBytes: limits.maxImageSizeMb * MB });
    return {
      buffer: optimized.buffer,
      originalName: optimized.originalName,
      sourceMimeType: optimized.sourceMimeType,
      mimeType: optimized.mimeType,
      extension: optimized.extension,
      sizeBytes: optimized.sizeBytes,
      width: optimized.width,
      height: optimized.height,
      checksumSha256: optimized.checksumSha256,
    };
  }

  const originalName = sanitizeFileName(file.name);
  const extension = path.extname(originalName).slice(1).toLowerCase();
  const safeMimeType = GENERIC_FILE_TYPES[extension];
  if (!safeMimeType) {
    throw new Error(`${originalName} is not a supported media-library file type.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return {
    buffer,
    originalName,
    sourceMimeType: declaredMime || safeMimeType,
    mimeType: safeMimeType,
    extension,
    sizeBytes: buffer.length,
    width: 0,
    height: 0,
    checksumSha256: crypto.createHash("sha256").update(buffer).digest("hex"),
  };
}

export async function GET(request: Request) {
  const user = await requireAdmin();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const category = normalizeMediaLibraryCategory(searchParams.get("type"));
  const skip = Math.max(0, Number.parseInt(searchParams.get("skip") || "0", 10) || 0);
  const take = Math.min(96, Math.max(1, Number.parseInt(searchParams.get("take") || String(MEDIA_LIBRARY_PAGE_SIZE), 10) || MEDIA_LIBRARY_PAGE_SIZE));

  const result = await listMediaLibraryItems({
    organizationId: user.organizationId,
    userId: user.id,
    search,
    category,
    skip,
    take,
  });

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();

  const formData = await request.formData();
  const files = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length === 0) return jsonError("Choose at least one file to upload.", 400);
  if (files.length > MAX_FILES_PER_UPLOAD) return jsonError(`Upload at most ${MAX_FILES_PER_UPLOAD} files at a time.`, 400);

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_TOTAL_BYTES) return jsonError("The selected files are larger than the 1 GB combined upload limit.", 413);

  await prunePendingStorageDeletes(user.organizationId, user.id);
  const configRecord = await getActiveStorageConfiguration(user.organizationId, user.id);
  const config = resolveStorageConfiguration(configRecord);

  const uploadedIds: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      const processed = await prepareUpload(file, config);
      const id = crypto.randomUUID();
      const objectKey = createStorageObjectKey(
        user.organizationId,
        "media-library",
        id,
        processed.extension,
        config.pathPrefix,
      );
      const publicUrl = config.provider === "local-private" ? "" : buildPublicObjectUrl(config.publicBaseUrl, objectKey);
      const url = publicUrl || `/api/media/${id}`;

      await putStoredObject(config, objectKey, processed.buffer, processed.mimeType);
      try {
        await prisma.uploadedFile.create({
          data: {
            id,
            purpose: MEDIA_LIBRARY_PURPOSE,
            ownerType: MEDIA_LIBRARY_OWNER_TYPE,
            ownerId: id,
            storageConfigurationId: configRecord.id,
            url,
            path: objectKey,
            originalName: processed.originalName,
            sourceMimeType: processed.sourceMimeType,
            mimeType: processed.mimeType,
            extension: processed.extension,
            sizeBytes: processed.sizeBytes,
            width: processed.width,
            height: processed.height,
            checksumSha256: processed.checksumSha256,
            status: "active",
            isCurrent: true,
            organizationId: user.organizationId,
            createdBy: user.id,
            updatedBy: user.id,
          },
        });
      } catch (error) {
        await deleteStoredObject(config, objectKey).catch(() => undefined);
        throw error;
      }

      uploadedIds.push(id);
      await logAudit({
        userId: user.id,
        userName: user.name,
        action: "UPLOAD",
        entityName: "UploadedFile",
        entityId: id,
        changes: {
          purpose: MEDIA_LIBRARY_PURPOSE,
          originalName: processed.originalName,
          mimeType: processed.mimeType,
          sizeBytes: processed.sizeBytes,
          storageConfigurationId: configRecord.id,
        },
        organizationId: user.organizationId,
      });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Failed to upload ${file.name || "file"}.`);
    }
  }

  if (uploadedIds.length === 0) {
    return jsonError(errors[0] || "The files could not be uploaded.", 400);
  }

  return NextResponse.json({
    uploadedCount: uploadedIds.length,
    errors,
  });
}
