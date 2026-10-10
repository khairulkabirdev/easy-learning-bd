import "server-only";

import type { Prisma } from "@prisma/client";

export const VOCABULARY_IMAGE_PURPOSE = "vocabulary-item-image";
export const VOCABULARY_ENTRY_OWNER_TYPE = "VocabularyEntry";

export type StoredUploadMetadata = {
  imageUrl: string;
  imagePath: string;
  originalName: string;
  sourceMimeType: string;
  mime: string;
  extension: string;
  size: number;
  width: number;
  height: number;
  checksumSha256: string;
};

type UploadFileClient = Pick<Prisma.TransactionClient, "uploadedFile">;

export async function getCurrentVocabularyUploadFiles(
  client: UploadFileClient,
  vocabularyEntryId: string,
  organizationId: string,
) {
  return client.uploadedFile.findMany({
    where: {
      vocabularyEntryId,
      organizationId,
      purpose: VOCABULARY_IMAGE_PURPOSE,
      isCurrent: true,
      status: "active",
    },
    select: {
      id: true,
      url: true,
      path: true,
      status: true,
      storageDeletedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createVocabularyUploadedFile(
  client: UploadFileClient,
  input: {
    vocabularyEntryId: string;
    organizationId: string;
    userId: string;
    stored: StoredUploadMetadata;
  },
) {
  return client.uploadedFile.create({
    data: {
      purpose: VOCABULARY_IMAGE_PURPOSE,
      ownerType: VOCABULARY_ENTRY_OWNER_TYPE,
      ownerId: input.vocabularyEntryId,
      vocabularyEntryId: input.vocabularyEntryId,
      url: input.stored.imageUrl,
      path: input.stored.imagePath,
      originalName: input.stored.originalName,
      sourceMimeType: input.stored.sourceMimeType,
      mimeType: input.stored.mime,
      extension: input.stored.extension,
      sizeBytes: input.stored.size,
      width: input.stored.width,
      height: input.stored.height,
      checksumSha256: input.stored.checksumSha256,
      status: "active",
      isCurrent: true,
      organizationId: input.organizationId,
      createdBy: input.userId,
      updatedBy: input.userId,
    },
  });
}

export async function markCurrentVocabularyUploadsReplaced(
  client: UploadFileClient,
  input: {
    vocabularyEntryId: string;
    organizationId: string;
    userId: string;
    at?: Date;
  },
) {
  return client.uploadedFile.updateMany({
    where: {
      vocabularyEntryId: input.vocabularyEntryId,
      organizationId: input.organizationId,
      purpose: VOCABULARY_IMAGE_PURPOSE,
      isCurrent: true,
      status: "active",
    },
    data: {
      status: "replaced",
      isCurrent: false,
      replacedAt: input.at ?? new Date(),
      updatedBy: input.userId,
    },
  });
}

export async function markCurrentVocabularyUploadsDeleted(
  client: UploadFileClient,
  input: {
    vocabularyEntryId: string;
    organizationId: string;
    userId: string;
    at?: Date;
  },
) {
  return client.uploadedFile.updateMany({
    where: {
      vocabularyEntryId: input.vocabularyEntryId,
      organizationId: input.organizationId,
      purpose: VOCABULARY_IMAGE_PURPOSE,
      isCurrent: true,
      status: "active",
    },
    data: {
      status: "deleted",
      isCurrent: false,
      deletedAt: input.at ?? new Date(),
      updatedBy: input.userId,
    },
  });
}

export async function markUploadStorageDeleted(
  client: UploadFileClient,
  input: {
    fileIds: string[];
    organizationId: string;
    userId: string;
    at?: Date;
  },
) {
  if (input.fileIds.length === 0) return;

  await client.uploadedFile.updateMany({
    where: {
      id: { in: input.fileIds },
      organizationId: input.organizationId,
    },
    data: {
      storageDeletedAt: input.at ?? new Date(),
      updatedBy: input.userId,
    },
  });
}
