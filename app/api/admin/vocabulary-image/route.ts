import { NextResponse } from "next/server";
import { z } from "zod";

import { assertTrustedMutationOrigin, requireAdmin } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";
import {
  createVocabularyUploadedFile,
  getCurrentVocabularyUploadFiles,
  markCurrentVocabularyUploadsDeleted,
  markCurrentVocabularyUploadsReplaced,
  markUploadStorageDeleted,
} from "@/lib/uploaded-file-tracker";
import { deleteVocabularyImage, optimizeAndStoreVocabularyImage } from "@/lib/vocabulary-image";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 6 * 1024 * 1024;

const entrySchema = z.object({
  contentId: z.string().min(1),
  blockId: z.string().min(1),
  vocabularyEntryId: z.string().min(1),
});

async function getOwnedVocabularyEntry(input: z.infer<typeof entrySchema>, organizationId: string) {
  return prisma.vocabularyEntry.findFirst({
    where: {
      id: input.vocabularyEntryId,
      organizationId,
      vocabulary: {
        contentId: input.contentId,
        contentBlockId: input.blockId,
        organizationId,
        contentBlock: {
          is: {
            id: input.blockId,
            contentId: input.contentId,
            kind: "vocabulary",
          },
        },
      },
    },
    select: {
      id: true,
      imageUrl: true,
      imagePath: true,
      word: true,
      vocabularyId: true,
    },
  });
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function removeTrackedPhysicalFiles(
  files: Array<{ id: string; path: string; url: string }>,
  fallbackPath: string,
  organizationId: string,
  userId: string,
) {
  const deletedIds: string[] = [];
  const seenPaths = new Set<string>();

  for (const file of files) {
    const storedPath = file.path || file.url;
    if (!storedPath || seenPaths.has(storedPath)) continue;
    seenPaths.add(storedPath);

    try {
      await deleteVocabularyImage(storedPath);
      deletedIds.push(file.id);
    } catch {
      // Keep storageDeletedAt empty so an operations/cleanup job can retry later.
    }
  }

  if (fallbackPath && !seenPaths.has(fallbackPath)) {
    await deleteVocabularyImage(fallbackPath).catch(() => undefined);
  }

  if (deletedIds.length > 0) {
    await markUploadStorageDeleted(prisma, {
      fileIds: deletedIds,
      organizationId,
      userId,
    });
  }
}

export async function POST(request: Request) {
  try {
    await assertTrustedMutationOrigin();
    const user = await requireAdmin();

    const contentLength = Number(request.headers.get("content-length") || "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return jsonError("Image upload is too large.", 413);
    }

    const formData = await request.formData();
    const parsed = entrySchema.parse({
      contentId: String(formData.get("contentId") || ""),
      blockId: String(formData.get("blockId") || ""),
      vocabularyEntryId: String(formData.get("vocabularyEntryId") || ""),
    });
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("Image file is required.", 400);
    }

    const entry = await getOwnedVocabularyEntry(parsed, user.organizationId);
    if (!entry) {
      return jsonError("Vocabulary row not found.", 404);
    }

    const oldTrackedFiles = await getCurrentVocabularyUploadFiles(prisma, entry.id, user.organizationId);
    const stored = await optimizeAndStoreVocabularyImage(file);

    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
        await markCurrentVocabularyUploadsReplaced(tx, {
          vocabularyEntryId: entry.id,
          organizationId: user.organizationId,
          userId: user.id,
        });

        const uploadedFile = await createVocabularyUploadedFile(tx, {
          vocabularyEntryId: entry.id,
          organizationId: user.organizationId,
          userId: user.id,
          stored,
        });

        const updatedEntry = await tx.vocabularyEntry.update({
          where: {
            id: entry.id,
            vocabularyId: entry.vocabularyId,
            organizationId: user.organizationId,
          },
          data: {
            imageUrl: stored.imageUrl,
            imagePath: stored.imagePath,
            updatedBy: user.id,
          },
        });

        return { uploadedFile, updatedEntry };
      });
    } catch (error) {
      await deleteVocabularyImage(stored.imagePath).catch(() => undefined);
      throw error;
    }

    await removeTrackedPhysicalFiles(
      oldTrackedFiles,
      entry.imagePath || entry.imageUrl,
      user.organizationId,
      user.id,
    );

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: "UPDATE",
      entityName: "VocabularyEntry",
      entityId: result.updatedEntry.id,
      changes: {
        imageUrl: result.updatedEntry.imageUrl,
        imagePath: result.updatedEntry.imagePath,
        uploadedFileId: result.uploadedFile.id,
      },
      organizationId: user.organizationId,
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: "CREATE",
      entityName: "UploadedFile",
      entityId: result.uploadedFile.id,
      changes: {
        ownerType: result.uploadedFile.ownerType,
        ownerId: result.uploadedFile.ownerId,
        url: result.uploadedFile.url,
        path: result.uploadedFile.path,
        status: result.uploadedFile.status,
      },
      organizationId: user.organizationId,
    });

    return NextResponse.json({
      imageUrl: result.updatedEntry.imageUrl,
      imagePath: result.updatedEntry.imagePath,
      uploadedFileId: result.uploadedFile.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image upload failed.";
    return jsonError(message, 400);
  }
}

export async function DELETE(request: Request) {
  try {
    await assertTrustedMutationOrigin();
    const user = await requireAdmin();
    const parsed = entrySchema.parse(await request.json());

    const entry = await getOwnedVocabularyEntry(parsed, user.organizationId);
    if (!entry) {
      return jsonError("Vocabulary row not found.", 404);
    }

    const currentFiles = await getCurrentVocabularyUploadFiles(prisma, entry.id, user.organizationId);

    const updated = await prisma.$transaction(async (tx) => {
      await markCurrentVocabularyUploadsDeleted(tx, {
        vocabularyEntryId: entry.id,
        organizationId: user.organizationId,
        userId: user.id,
      });

      return tx.vocabularyEntry.update({
        where: {
          id: entry.id,
          vocabularyId: entry.vocabularyId,
          organizationId: user.organizationId,
        },
        data: {
          imageUrl: "",
          imagePath: "",
          updatedBy: user.id,
        },
      });
    });

    await removeTrackedPhysicalFiles(
      currentFiles,
      entry.imagePath || entry.imageUrl,
      user.organizationId,
      user.id,
    );

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: "UPDATE",
      entityName: "VocabularyEntry",
      entityId: updated.id,
      changes: { imageUrl: "", imagePath: "", uploadedFileStatus: "deleted" },
      organizationId: user.organizationId,
    });

    return NextResponse.json({ imageUrl: "", imagePath: "" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove image.";
    return jsonError(message, 400);
  }
}
