import "server-only";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/db";
import { ensureDefaultStorageConfiguration, findStorageConfigurationForFile, resolveStorageConfiguration } from "@/lib/storage/configurations";
import { optimizeImageFile } from "@/lib/storage/image-processing";
import { createStorageObjectKey, deleteStoredObject, getStoredObject, putStoredObject } from "@/lib/storage/object-store";

const MEDIA_URL_PREFIX = "/api/media/";
const LEGACY_PUBLIC_ROOT = path.resolve(process.cwd(), "public", "uploads");

export type UploadActor = { organizationId: string; userId: string };

export function getManagedMediaId(value: string | null | undefined) {
  if (!value || !value.startsWith(MEDIA_URL_PREFIX)) return null;
  const id = value.slice(MEDIA_URL_PREFIX.length);
  return /^[A-Za-z0-9_-]{8,100}$/.test(id) ? id : null;
}

export function isManagedMediaUrl(value: string | null | undefined) {
  return Boolean(getManagedMediaId(value));
}

function resolveLegacyPublicUpload(value: string) {
  if (!value.startsWith("/uploads/")) return null;
  if (value.includes("\\") || value.includes("\0") || value.includes("..")) return null;
  const absolutePath = path.resolve(process.cwd(), "public", value.replace(/^\/+/, ""));
  const relative = path.relative(LEGACY_PUBLIC_ROOT, absolutePath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return absolutePath;
}

async function deleteLegacyPublicUpload(value: string) {
  const absolutePath = resolveLegacyPublicUpload(value);
  if (!absolutePath) return;
  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function deleteTrackedObject(file: {
  id: string;
  path: string;
  url?: string;
  organizationId: string;
  storageConfigurationId: string | null;
}) {
  if (!file.storageConfigurationId) {
    const candidate = file.path || file.url || "";
    const legacyPath = candidate.startsWith("public/")
      ? `/${candidate.slice("public/".length)}`
      : candidate.startsWith("/uploads/")
        ? candidate
        : "";
    await deleteLegacyPublicUpload(legacyPath);
    return;
  }
  const config = await findStorageConfigurationForFile(file.storageConfigurationId, file.organizationId);
  if (!config) throw new Error("The storage configuration for this file is no longer available.");
  await deleteStoredObject(resolveStorageConfiguration(config), file.path);
}

export async function prunePendingStorageDeletes(organizationId: string, userId: string) {
  const pending = await prisma.uploadedFile.findMany({
    where: {
      organizationId,
      status: { in: ["replaced", "deleted"] },
      storageDeletedAt: null,
    },
  });

  for (const file of pending) {
    try {
      await deleteTrackedObject(file);
      await prisma.uploadedFile.update({
        where: { id: file.id },
        data: { storageDeletedAt: new Date(), updatedBy: userId },
      });
    } catch {
      // Keep storageDeletedAt null so a later upload can retry the cleanup.
    }
  }
}

async function pruneExpiredTemporaryUploads(actor: UploadActor) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const expired = await prisma.uploadedFile.findMany({
    where: {
      organizationId: actor.organizationId,
      ownerType: "TempUpload",
      purpose: "temporary-image",
      createdAt: { lt: cutoff },
      OR: [
        { status: "active", isCurrent: true },
        { status: "deleted", storageDeletedAt: null },
      ],
    },
  });

  for (const file of expired) {
    if (file.status === "active") {
      await prisma.uploadedFile.update({
        where: { id: file.id },
        data: { status: "deleted", isCurrent: false, deletedAt: new Date(), updatedBy: actor.userId },
      });
    }
    try {
      await deleteTrackedObject(file);
      await prisma.uploadedFile.update({
        where: { id: file.id },
        data: { storageDeletedAt: new Date(), updatedBy: actor.userId },
      });
    } catch {
      // Keep storageDeletedAt empty so a later upload cleanup pass can retry.
    }
  }
}

export async function saveImageToManagedTemp(file: File, actor: UploadActor) {
  await pruneExpiredTemporaryUploads(actor);
  await prunePendingStorageDeletes(actor.organizationId, actor.userId);
  const configRecord = await ensureDefaultStorageConfiguration(actor.organizationId, actor.userId);
  const config = resolveStorageConfiguration(configRecord);
  const optimized = await optimizeImageFile(file, { maxInputBytes: config.maxImageSizeMb * 1024 * 1024 });
  const id = crypto.randomUUID();
  const key = createStorageObjectKey(actor.organizationId, "temp", id, optimized.extension, config.pathPrefix);
  const url = `${MEDIA_URL_PREFIX}${id}`;

  await putStoredObject(config, key, optimized.buffer, optimized.mimeType);
  try {
    await prisma.uploadedFile.create({
      data: {
        id,
        purpose: "temporary-image",
        ownerType: "TempUpload",
        ownerId: id,
        storageConfigurationId: configRecord.id,
        url,
        path: key,
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
        organizationId: actor.organizationId,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
    });
  } catch (error) {
    await deleteStoredObject(config, key).catch(() => undefined);
    throw error;
  }

  return { id, publicPath: url, url, path: key };
}

export async function assertOwnedTemporaryImage(value: string, actor: UploadActor) {
  const id = getManagedMediaId(value);
  if (!id) throw new Error("Invalid uploaded image reference.");

  const file = await prisma.uploadedFile.findFirst({
    where: {
      id,
      organizationId: actor.organizationId,
      createdBy: actor.userId,
      ownerType: "TempUpload",
      purpose: "temporary-image",
      status: "active",
      isCurrent: true,
    },
  });
  if (!file) throw new Error("This temporary upload is missing, expired, or not owned by your account.");
  return file;
}

export async function deleteTemporaryImage(value: string | null | undefined, actor: UploadActor) {
  const id = getManagedMediaId(value);
  if (!id) return;

  const file = await prisma.uploadedFile.findFirst({
    where: {
      id,
      organizationId: actor.organizationId,
      createdBy: actor.userId,
      ownerType: "TempUpload",
      purpose: "temporary-image",
      status: "active",
      isCurrent: true,
    },
  });
  if (!file) return;

  await prisma.uploadedFile.update({
    where: { id: file.id },
    data: { status: "deleted", isCurrent: false, deletedAt: new Date(), updatedBy: actor.userId },
  });
  try {
    await deleteTrackedObject(file);
    await prisma.uploadedFile.update({
      where: { id: file.id },
      data: { storageDeletedAt: new Date(), updatedBy: actor.userId },
    });
  } catch {
    // Keep storageDeletedAt null so a later cleanup process can retry.
  }
}

export async function finalizeManagedImageChange(input: {
  previousImagePath?: string | null;
  nextImagePath?: string | null;
  organizationId: string;
  userId: string;
  ownerType: string;
  ownerId: string;
  purpose: "profile-image" | "entity-image";
}) {
  const previousPath = input.previousImagePath?.trim() || "";
  const nextPath = input.nextImagePath?.trim() || "";
  if (previousPath === nextPath) {
    const sameId = getManagedMediaId(nextPath);
    if (sameId) {
      const pending = await prisma.uploadedFile.findFirst({
        where: {
          id: sameId,
          organizationId: input.organizationId,
          createdBy: input.userId,
          ownerType: "TempUpload",
          purpose: "temporary-image",
          status: "active",
          isCurrent: true,
        },
      });
      if (pending) {
        const previousOwnerFiles = await prisma.uploadedFile.findMany({
          where: {
            organizationId: input.organizationId,
            ownerType: input.ownerType,
            ownerId: input.ownerId,
            purpose: input.purpose,
            status: "active",
            isCurrent: true,
            id: { not: pending.id },
          },
        });
        await prisma.$transaction(async (tx) => {
          if (previousOwnerFiles.length) {
            await tx.uploadedFile.updateMany({
              where: { id: { in: previousOwnerFiles.map((file) => file.id) }, organizationId: input.organizationId },
              data: { status: "replaced", isCurrent: false, replacedAt: new Date(), updatedBy: input.userId },
            });
          }
          await tx.uploadedFile.update({
            where: { id: pending.id },
            data: {
              purpose: input.purpose,
              ownerType: input.ownerType,
              ownerId: input.ownerId,
              updatedBy: input.userId,
            },
          });
        });
        for (const oldFile of previousOwnerFiles) {
          try {
            await deleteTrackedObject(oldFile);
            await prisma.uploadedFile.update({
              where: { id: oldFile.id },
              data: { storageDeletedAt: new Date(), updatedBy: input.userId },
            });
          } catch {
            // Keep storageDeletedAt empty so a later upload can retry cleanup.
          }
        }
      }
    }
    return;
  }

  const nextId = getManagedMediaId(nextPath);
  let nextFile: Awaited<ReturnType<typeof assertOwnedTemporaryImage>> | null = null;
  if (nextId) nextFile = await assertOwnedTemporaryImage(nextPath, { organizationId: input.organizationId, userId: input.userId });

  const previousId = getManagedMediaId(previousPath);
  const previousFile = previousId
    ? await prisma.uploadedFile.findFirst({
        where: {
          id: previousId,
          organizationId: input.organizationId,
          ownerType: input.ownerType,
          ownerId: input.ownerId,
          status: "active",
          isCurrent: true,
        },
      })
    : null;

  await prisma.$transaction(async (tx) => {
    if (previousFile) {
      await tx.uploadedFile.update({
        where: { id: previousFile.id },
        data: {
          status: nextPath ? "replaced" : "deleted",
          isCurrent: false,
          ...(nextPath ? { replacedAt: new Date() } : { deletedAt: new Date() }),
          updatedBy: input.userId,
        },
      });
    }

    if (nextFile) {
      await tx.uploadedFile.update({
        where: { id: nextFile.id },
        data: {
          purpose: input.purpose,
          ownerType: input.ownerType,
          ownerId: input.ownerId,
          updatedBy: input.userId,
        },
      });
    }
  });

  if (previousFile) {
    try {
      await deleteTrackedObject(previousFile);
      await prisma.uploadedFile.update({
        where: { id: previousFile.id },
        data: { storageDeletedAt: new Date(), updatedBy: input.userId },
      });
    } catch {
      // The lifecycle record intentionally keeps storageDeletedAt null on failure.
    }
  } else if (previousPath && !previousId) {
    await deleteLegacyPublicUpload(previousPath).catch(() => undefined);
  }
}

export async function readManagedImageFile(fileId: string, organizationId: string) {
  return prisma.uploadedFile.findFirst({
    where: {
      id: fileId,
      organizationId,
      status: "active",
      isCurrent: true,
    },
    include: {
      vocabularyEntry: { select: { vocabulary: { select: { classId: true } } } },
    },
  });
}

export async function getStoredObjectForUpload(file: {
  id: string;
  path: string;
  url: string;
  organizationId: string;
  storageConfigurationId: string | null;
  mimeType: string;
}) {
  if (!file.storageConfigurationId) {
    const legacyPath = file.path.startsWith("public/") ? `/${file.path.slice("public/".length)}` : file.url;
    const absolutePath = resolveLegacyPublicUpload(legacyPath);
    if (!absolutePath) throw new Error("Stored file location is not supported.");
    const body = await fs.readFile(absolutePath);
    return { body, contentType: file.mimeType || "application/octet-stream" };
  }

  const config = await findStorageConfigurationForFile(file.storageConfigurationId, file.organizationId);
  if (!config) throw new Error("The storage configuration for this file is no longer available.");
  const resolved = resolveStorageConfiguration(config);
  const stored = await getStoredObject(resolved, file.path);
  return { ...stored, contentType: file.mimeType || stored.contentType };
}

export async function deleteStoredUploadById(fileId: string, organizationId: string, userId: string) {
  const file = await prisma.uploadedFile.findFirst({ where: { id: fileId, organizationId } });
  if (!file) return;
  await prisma.uploadedFile.update({
    where: { id: file.id },
    data: { status: "deleted", isCurrent: false, deletedAt: new Date(), updatedBy: userId },
  });
  try {
    await deleteTrackedObject(file);
    await prisma.uploadedFile.update({
      where: { id: file.id },
      data: { storageDeletedAt: new Date(), updatedBy: userId },
    });
  } catch {
    // Preserve an empty storageDeletedAt timestamp for retries.
  }
}
