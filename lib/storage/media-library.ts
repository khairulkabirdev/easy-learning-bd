import "server-only";

import path from "node:path";
import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/db";
import { ensureDefaultStorageConfiguration } from "@/lib/storage/configurations";

export const MEDIA_LIBRARY_OWNER_TYPE = "MediaLibrary";
export const MEDIA_LIBRARY_PURPOSE = "media-library";
export const MEDIA_LIBRARY_PAGE_SIZE = 48;

export const MEDIA_LIBRARY_CATEGORIES = ["all", "images", "videos", "3d", "documents"] as const;
export type MediaLibraryCategory = (typeof MEDIA_LIBRARY_CATEGORIES)[number];

const MODEL_EXTENSIONS = ["glb", "gltf", "obj", "fbx", "stl"];

export type MediaLibraryItem = {
  id: string;
  name: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
  url: string;
  purpose: string;
  ownerType: string;
  deletable: boolean;
  storageName: string;
  storageProvider: string;
};

export function normalizeMediaLibraryCategory(value: string | null | undefined): MediaLibraryCategory {
  return MEDIA_LIBRARY_CATEGORIES.includes(value as MediaLibraryCategory)
    ? (value as MediaLibraryCategory)
    : "all";
}

export function getMediaLibraryCategoryWhere(category: MediaLibraryCategory): Prisma.UploadedFileWhereInput {
  if (category === "images") return { mimeType: { startsWith: "image/" } };
  if (category === "videos") return { mimeType: { startsWith: "video/" } };
  if (category === "3d") return { extension: { in: MODEL_EXTENSIONS } };
  if (category === "documents") {
    return {
      AND: [
        { NOT: { mimeType: { startsWith: "image/" } } },
        { NOT: { mimeType: { startsWith: "video/" } } },
        { extension: { notIn: MODEL_EXTENSIONS } },
      ],
    };
  }
  return {};
}

function cleanSearch(value: string | null | undefined) {
  return (value || "").trim().replace(/\s+/g, " ").slice(0, 120);
}

export async function listMediaLibraryItems(input: {
  organizationId: string;
  userId: string;
  search?: string;
  category?: MediaLibraryCategory;
  skip?: number;
  take?: number;
}) {
  const search = cleanSearch(input.search);
  const category = normalizeMediaLibraryCategory(input.category);
  const skip = Math.max(0, Math.floor(input.skip ?? 0));
  const take = Math.min(96, Math.max(1, Math.floor(input.take ?? MEDIA_LIBRARY_PAGE_SIZE)));

  const categoryWhere = getMediaLibraryCategoryWhere(category);
  const where: Prisma.UploadedFileWhereInput = {
    organizationId: input.organizationId,
    status: "active",
    isCurrent: true,
    AND: [
      { ownerType: { not: "TempUpload" } },
      categoryWhere,
    ],
    ...(search
      ? {
          OR: [
            { originalName: { contains: search } },
            { extension: { contains: search.replace(/^\./, "") } },
            { mimeType: { contains: search } },
          ],
        }
      : {}),
  };

  const [records, total, activeStorage] = await Promise.all([
    prisma.uploadedFile.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take,
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        extension: true,
        sizeBytes: true,
        width: true,
        height: true,
        createdAt: true,
        updatedAt: true,
        url: true,
        purpose: true,
        ownerType: true,
        storageConfiguration: {
          select: { name: true, provider: true },
        },
      },
    }),
    prisma.uploadedFile.count({ where }),
    ensureDefaultStorageConfiguration(input.organizationId, input.userId),
  ]);

  const items: MediaLibraryItem[] = records.map((record) => ({
    id: record.id,
    name: record.originalName || `${record.id}.${record.extension || "file"}`,
    mimeType: record.mimeType || "application/octet-stream",
    extension: (record.extension || path.extname(record.originalName).slice(1) || "file").toLowerCase(),
    sizeBytes: record.sizeBytes,
    width: record.width,
    height: record.height,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    url: record.url || `/api/media/${record.id}`,
    purpose: record.purpose,
    ownerType: record.ownerType,
    deletable: record.ownerType === MEDIA_LIBRARY_OWNER_TYPE && record.purpose === MEDIA_LIBRARY_PURPOSE,
    storageName: record.storageConfiguration?.name || activeStorage.name,
    storageProvider: record.storageConfiguration?.provider || activeStorage.provider,
  }));

  return {
    items,
    total,
    hasMore: skip + items.length < total,
    activeStorage: {
      name: activeStorage.name,
      provider: activeStorage.provider,
    },
  };
}
