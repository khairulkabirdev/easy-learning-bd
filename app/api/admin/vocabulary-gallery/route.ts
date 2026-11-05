import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { assertTrustedMutationOrigin, requireAdmin } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";
import { getActiveStorageConfiguration, findStorageConfigurationForFile, resolveStorageConfiguration } from "@/lib/storage/configurations";
import { createStorageObjectKey, deleteStoredObject, putStoredObject } from "@/lib/storage/object-store";
import { optimizeImageFile } from "@/lib/storage/image-processing";
import { prunePendingStorageDeletes } from "@/lib/storage/upload-management";

export const runtime = "nodejs";

const OWNER_TYPE = "VocabularyBlock";
const PURPOSE = "vocabulary-block-gallery";
const MAX_BATCH = 12;
const MAX_GALLERY = 60;
const blockSchema = z.object({ contentId: z.string().min(1), blockId: z.string().min(1) });
const imageSelect = { id: true, url: true, path: true, sortOrder: true, storageConfigurationId: true } as const;

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function verifyBlock(input: z.infer<typeof blockSchema>, organizationId: string) {
  return prisma.contentBlock.findFirst({
    where: {
      id: input.blockId,
      contentId: input.contentId,
      kind: "vocabulary",
      content: { organizationId },
      vocabulary: { isNot: null },
    },
    select: { id: true },
  });
}

function whereGallery(blockId: string, organizationId: string) {
  return {
    ownerType: OWNER_TYPE,
    ownerId: blockId,
    purpose: PURPOSE,
    organizationId,
    status: "active",
    isCurrent: true,
  };
}

async function listImages(blockId: string, organizationId: string) {
  const rows = await prisma.uploadedFile.findMany({
    where: whereGallery(blockId, organizationId),
    select: imageSelect,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows;
}

function serialize(rows: Awaited<ReturnType<typeof listImages>>) {
  return rows.map(({ id, url, path, sortOrder }) => ({ id, url, path, sortOrder }));
}

export async function POST(request: Request) {
  try {
    await assertTrustedMutationOrigin();
    const user = await requireAdmin();
    const formData = await request.formData();
    const input = blockSchema.parse({
      contentId: String(formData.get("contentId") || ""),
      blockId: String(formData.get("blockId") || ""),
    });
    if (!(await verifyBlock(input, user.organizationId))) return bad("Vocabulary block not found.", 404);
    const files = formData.getAll("files");
    if (!files.length || files.length > MAX_BATCH || files.some((file) => !(file instanceof File))) {
      return bad(`Choose 1–${MAX_BATCH} image files.`);
    }
    const active = await getActiveStorageConfiguration(user.organizationId, user.id);
    const storage = resolveStorageConfiguration(active);
    const maxImageBytes = storage.maxImageSizeMb * 1024 * 1024;
    const images = files as File[];
    if (images.some((file) => !file.size || file.size > maxImageBytes || !["image/png", "image/jpeg", "image/webp"].includes(file.type.toLowerCase()))) {
      return bad(`Images must be JPEG, PNG or WebP and no larger than ${storage.maxImageSizeMb} MB each.`, 413);
    }
    await prunePendingStorageDeletes(user.organizationId, user.id);
    const existing = await listImages(input.blockId, user.organizationId);
    if (existing.length + images.length > MAX_GALLERY) return bad(`Gallery limit: ${MAX_GALLERY} images.`);

    const stored: Array<{
      id: string; key: string; originalName: string; sourceMimeType: string;
      mime: string; extension: string; size: number; width: number; height: number; checksum: string;
    }> = [];
    try {
      for (const file of images) {
        const optimized = await optimizeImageFile(file, { maxInputBytes: maxImageBytes });
        const id = crypto.randomUUID();
        const key = createStorageObjectKey(user.organizationId, "vocabulary-gallery", id, optimized.extension, storage.pathPrefix);
        await putStoredObject(storage, key, optimized.buffer, optimized.mimeType);
        stored.push({
          id, key, originalName: optimized.originalName, sourceMimeType: optimized.sourceMimeType,
          mime: optimized.mimeType, extension: optimized.extension, size: optimized.sizeBytes,
          width: optimized.width, height: optimized.height, checksum: optimized.checksumSha256,
        });
      }
      const nextSort = existing.length ? Math.max(...existing.map((file) => file.sortOrder)) + 1 : 0;
      await prisma.$transaction(async (tx) => {
        for (const [index, image] of stored.entries()) {
          await tx.uploadedFile.create({
            data: {
              id: image.id,
              purpose: PURPOSE,
              ownerType: OWNER_TYPE,
              ownerId: input.blockId,
              vocabularyEntryId: null,
              storageConfigurationId: active.id,
              url: `/api/media/${image.id}`,
              path: image.key,
              originalName: image.originalName,
              sourceMimeType: image.sourceMimeType,
              mimeType: image.mime,
              extension: image.extension,
              sizeBytes: image.size,
              sortOrder: nextSort + index,
              width: image.width,
              height: image.height,
              checksumSha256: image.checksum,
              status: "active",
              isCurrent: true,
              organizationId: user.organizationId,
              createdBy: user.id,
              updatedBy: user.id,
            },
          });
        }
      });
    } catch (error) {
      await Promise.all(stored.map((image) => deleteStoredObject(storage, image.key).catch(() => undefined)));
      throw error;
    }
    await logAudit({
      userId: user.id, userName: user.name, organizationId: user.organizationId,
      entityName: "ContentBlock", entityId: input.blockId, action: "UPDATE",
      changes: { galleryImageIdsAdded: stored.map((image) => image.id) },
    });
    return NextResponse.json({ images: serialize(await listImages(input.blockId, user.organizationId)) });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Could not upload gallery images.");
  }
}

export async function PATCH(request: Request) {
  try {
    await assertTrustedMutationOrigin();
    const user = await requireAdmin();
    const input = blockSchema.extend({ imageIds: z.array(z.string().min(1)).max(MAX_GALLERY) }).parse(await request.json());
    if (!(await verifyBlock(input, user.organizationId))) return bad("Vocabulary block not found.", 404);
    const current = await listImages(input.blockId, user.organizationId);
    if (input.imageIds.length !== current.length || new Set(input.imageIds).size !== current.length ||
      !input.imageIds.every((id) => current.some((image) => image.id === id))) return bad("Invalid gallery order.");
    await prisma.$transaction(async (tx) => {
      for (const [sortOrder, id] of input.imageIds.entries()) {
        await tx.uploadedFile.updateMany({
          where: { ...whereGallery(input.blockId, user.organizationId), id },
          data: { sortOrder, updatedBy: user.id },
        });
      }
    });
    return NextResponse.json({ images: serialize(await listImages(input.blockId, user.organizationId)) });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Could not reorder gallery.");
  }
}

export async function DELETE(request: Request) {
  try {
    await assertTrustedMutationOrigin();
    const user = await requireAdmin();
    const input = blockSchema.extend({ imageId: z.string().min(1) }).parse(await request.json());
    if (!(await verifyBlock(input, user.organizationId))) return bad("Vocabulary block not found.", 404);
    const file = await prisma.uploadedFile.findFirst({
      where: { ...whereGallery(input.blockId, user.organizationId), id: input.imageId },
      select: imageSelect,
    });
    if (!file) return bad("Gallery image not found.", 404);
    await prisma.uploadedFile.updateMany({
      where: { ...whereGallery(input.blockId, user.organizationId), id: input.imageId },
      data: { status: "deleted", isCurrent: false, deletedAt: new Date(), updatedBy: user.id },
    });
    try {
      if (!file.storageConfigurationId) throw new Error("Storage configuration not available.");
      const config = await findStorageConfigurationForFile(file.storageConfigurationId, user.organizationId);
      if (!config) throw new Error("Original storage configuration not found.");
      await deleteStoredObject(resolveStorageConfiguration(config), file.path);
      await prisma.uploadedFile.update({ where: { id: file.id }, data: { storageDeletedAt: new Date() } });
    } catch {
      // Retain pending deletion metadata so the storage cleanup job can retry.
    }
    return NextResponse.json({ images: serialize(await listImages(input.blockId, user.organizationId)) });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Could not delete gallery image.");
  }
}
