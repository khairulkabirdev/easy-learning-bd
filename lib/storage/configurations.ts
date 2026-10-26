import "server-only";

import { prisma } from "@/lib/db";
import { decryptStorageSecret } from "@/lib/storage/secrets";
import type {
  ResolvedStorageConfiguration,
  StorageConfigurationRecord,
  StorageConfigurationView,
  StorageConfigurationClientView,
} from "@/lib/storage/types";

export async function ensureDefaultStorageConfiguration(organizationId: string, userId: string) {
  const active = await prisma.storageConfiguration.findFirst({
    where: { organizationId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (active) return active as StorageConfigurationRecord;

  const existingLocal = await prisma.storageConfiguration.findFirst({
    where: { organizationId, provider: "local-private" },
    orderBy: { createdAt: "asc" },
  });

  return prisma.$transaction(async (tx) => {
    await tx.storageConfiguration.updateMany({
      where: { organizationId },
      data: { isActive: false },
    });

    if (existingLocal) {
      return tx.storageConfiguration.update({
        where: { id: existingLocal.id },
        data: { isActive: true, everActivated: true, updatedBy: userId },
      }) as Promise<StorageConfigurationRecord>;
    }

    return tx.storageConfiguration.create({
      data: {
        name: "Local private storage",
        provider: "local-private",
        endpoint: "",
        region: "auto",
        bucket: "",
        accessKeyId: "",
        secretAccessKeyEncrypted: "",
        sessionTokenEncrypted: "",
        localRoot: "storage/private",
        forcePathStyle: false,
        publicBaseUrl: "",
        privateBucket: "",
        maxImageSizeMb: 20,
        maxVideoSizeMb: 1024,
        maxModelSizeMb: 500,
        pathPrefix: "uploads",
        isActive: true,
        everActivated: true,
        lastTestStatus: "unknown",
        lastTestMessage: "",
        organizationId,
        createdBy: userId,
        updatedBy: userId,
      },
    }) as Promise<StorageConfigurationRecord>;
  });
}

export async function getActiveStorageConfiguration(organizationId: string, userId: string) {
  return ensureDefaultStorageConfiguration(organizationId, userId);
}

export function resolveStorageConfiguration(record: StorageConfigurationRecord): ResolvedStorageConfiguration {
  return {
    ...record,
    secretAccessKey: decryptStorageSecret(record.secretAccessKeyEncrypted),
    sessionToken: decryptStorageSecret(record.sessionTokenEncrypted),
  };
}

export function toStorageConfigurationView(record: StorageConfigurationRecord): StorageConfigurationView {
  const { secretAccessKeyEncrypted, sessionTokenEncrypted, accessKeyId, ...safe } = record;
  return {
    ...safe,
    accessKeyId,
    hasSecretAccessKey: Boolean(secretAccessKeyEncrypted),
    hasSessionToken: Boolean(sessionTokenEncrypted),
  };
}

export async function findStorageConfigurationForOrganization(id: string, organizationId: string) {
  return prisma.storageConfiguration.findFirst({ where: { id, organizationId } }) as Promise<StorageConfigurationRecord | null>;
}

export async function findStorageConfigurationForFile(storageConfigurationId: string | null, organizationId: string) {
  if (!storageConfigurationId) return null;
  return findStorageConfigurationForOrganization(storageConfigurationId, organizationId);
}

export async function listStorageConfigurationViews(
  organizationId: string,
  userId: string,
): Promise<StorageConfigurationClientView[]> {
  await ensureDefaultStorageConfiguration(organizationId, userId);
  const records = await prisma.storageConfiguration.findMany({
    where: { organizationId },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
  });

  return Promise.all(
    records.map(async (record) => {
      const uploadedFileCount = await prisma.uploadedFile.count({
        where: { storageConfigurationId: record.id, storageDeletedAt: null },
      });

      return {
        id: record.id,
        name: record.name,
        provider: record.provider,
        endpoint: record.endpoint,
        region: record.region,
        bucket: record.bucket,
        accessKeyId: record.accessKeyId,
        hasSecretAccessKey: Boolean(record.secretAccessKeyEncrypted),
        hasSessionToken: Boolean(record.sessionTokenEncrypted),
        localRoot: record.localRoot,
        forcePathStyle: record.forcePathStyle,
        publicBaseUrl: record.publicBaseUrl,
        privateBucket: record.privateBucket,
        maxImageSizeMb: record.maxImageSizeMb,
        maxVideoSizeMb: record.maxVideoSizeMb,
        maxModelSizeMb: record.maxModelSizeMb,
        pathPrefix: record.pathPrefix,
        isActive: record.isActive,
        isLocked: record.everActivated || uploadedFileCount > 0,
        lastTestStatus: record.lastTestStatus,
        lastTestMessage: record.lastTestMessage,
        lastTestedAt: record.lastTestedAt?.toISOString() || null,
        uploadedFileCount,
      };
    }),
  );
}
