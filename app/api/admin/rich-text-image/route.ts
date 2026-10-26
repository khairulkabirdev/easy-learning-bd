import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { assertTrustedMutationOrigin, requireAdmin } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";
import { getActiveStorageConfiguration, resolveStorageConfiguration } from "@/lib/storage/configurations";
import { optimizeImageFile } from "@/lib/storage/image-processing";
import { createStorageObjectKey, deleteStoredObject, putStoredObject } from "@/lib/storage/object-store";
import { prunePendingStorageDeletes } from "@/lib/storage/upload-management";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MB = 1024 * 1024;
const MULTIPART_OVERHEAD_BYTES = MB;
const RICH_TEXT_OWNER_TYPE = "RichTextAsset";
const RICH_TEXT_PURPOSE = "rich-text-image";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    await assertTrustedMutationOrigin();
    const user = await requireAdmin();
    const configRecord = await getActiveStorageConfiguration(user.organizationId, user.id);
    const config = resolveStorageConfiguration(configRecord);
    const maxImageBytes = config.maxImageSizeMb * MB;

    const contentLength = Number(request.headers.get("content-length") || "0");
    if (Number.isFinite(contentLength) && contentLength > maxImageBytes + MULTIPART_OVERHEAD_BYTES) {
      return jsonError(`Image upload is larger than the configured ${config.maxImageSizeMb} MB limit.`, 413);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return jsonError("Image file is required.", 400);

    await prunePendingStorageDeletes(user.organizationId, user.id);
    const optimized = await optimizeImageFile(file, { maxInputBytes: maxImageBytes });
    const id = crypto.randomUUID();
    const objectKey = createStorageObjectKey(
      user.organizationId,
      "rich-text",
      id,
      optimized.extension,
      config.pathPrefix,
    );
    const url = `/api/media/${id}`;

    await putStoredObject(config, objectKey, optimized.buffer, optimized.mimeType);
    try {
      await prisma.uploadedFile.create({
        data: {
          id,
          purpose: RICH_TEXT_PURPOSE,
          ownerType: RICH_TEXT_OWNER_TYPE,
          ownerId: id,
          storageConfigurationId: configRecord.id,
          url,
          path: objectKey,
          originalName: optimized.originalName,
          sourceMimeType: optimized.sourceMimeType,
          mimeType: optimized.mimeType,
          extension: optimized.extension,
          sizeBytes: optimized.sizeBytes,
          width: optimized.width,
          height: optimized.height,
          checksumSha256: optimized.checksumSha256,
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

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: "UPLOAD",
      entityName: "UploadedFile",
      entityId: id,
      changes: {
        purpose: RICH_TEXT_PURPOSE,
        originalName: optimized.originalName,
        mimeType: optimized.mimeType,
        sizeBytes: optimized.sizeBytes,
        storageConfigurationId: configRecord.id,
      },
      organizationId: user.organizationId,
    });

    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image upload failed.";
    return jsonError(message, 400);
  }
}
