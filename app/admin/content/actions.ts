"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin, assertTrustedMutationOrigin } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";
import { SEEN_PASSAGE_ONE_REF, SEEN_PASSAGE_TWO_REF, isSeenPassageRef } from "@/lib/seen-composition-passages";
import {
  VOCABULARY_IMAGE_PURPOSE,
  getCurrentVocabularyUploadFiles,
  markCurrentVocabularyUploadsDeleted,
  markUploadStorageDeleted,
} from "@/lib/uploaded-file-tracker";
import { deleteVocabularyImage } from "@/lib/vocabulary-image";
import {
  crudValidationWouldRegress,
  firstCrudValidationError,
  validateChangingSentenceAnswerJson,
  validateInformationTransferDocumentJson,
  validateMcqDocumentJson,
  validateQuestionAnswerDocumentJson,
  validateTagQuestionAnswerJson,
  validateTrueFalseDocumentJson,
} from "@/app/admin/content/content-block-validation";

const contentBlockKindSchema = z.enum([
  "paragraph",
  "seen-passage-one",
  "seen-passage-two",
  "vocabulary",
  "synonyms-antonyms",
  "gap-fill",
  "gap-fill-first-paper",
  "gap-fill-second-paper",
  "mcq",
  "true-false",
  "question-answer",
  "table-completion",
  "column-matching",
  "rearrange-sentence",
  "question-from-poems",
  "question-from-story",
  "information-transfer",
  "substitution-table",
  "right-form-of-verb",
  "narration",
  "changing-sentence",
  "punctuation-and-capitalization",
  "preposition",
  "suffix-and-prefix",
  "tag-question",
  "connector",
]);

type TrackedVocabularyFile = {
  id: string;
  path: string;
  url: string;
};

async function deleteTrackedVocabularyStorage(
  files: TrackedVocabularyFile[],
  fallbackPaths: string[],
  organizationId: string,
  userId: string,
) {
  const deletedIds: string[] = [];
  const seenPaths = new Set<string>();

  for (const file of files) {
    const storagePath = file.path || file.url;
    if (!storagePath || seenPaths.has(storagePath)) continue;
    seenPaths.add(storagePath);

    try {
      await deleteVocabularyImage(storagePath);
      deletedIds.push(file.id);
    } catch {
      // Keep storageDeletedAt empty so a later cleanup job can retry.
    }
  }

  for (const fallbackPath of fallbackPaths) {
    if (!fallbackPath || seenPaths.has(fallbackPath)) continue;
    seenPaths.add(fallbackPath);
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

const contentSchema = z.object({
  id: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1, "Title is required.").max(200, "Title is too long.").optional(),
  classId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
  unitId: z.string().trim().min(1),
  lessonId: z.string().trim().min(1),
  topicId: z.string().trim().min(1).optional(),
});


const contentTitleSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1, "Title is required.").max(200, "Title is too long."),
});

const createBlockSchema = z.object({
  contentId: z.string().min(1),
  kind: contentBlockKindSchema,
});

const blockBoardYearSchema = z.object({
  blockId: z.string().min(1),
  boardId: z.string().min(1).nullable(),
  academicYearId: z.string().min(1).nullable(),
});

const reorderBlocksSchema = z
  .array(
    z.object({
      id: z.string().min(1),
      sortOrder: z.number().int().min(0).max(10000),
    }),
  )
  .max(1000)
  .superRefine((items, ctx) => {
    const ids = new Set<string>();
    for (const [index, item] of items.entries()) {
      if (ids.has(item.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate content block id.",
          path: [index, "id"],
        });
      }
      ids.add(item.id);
    }
  });

const updateParagraphSchema = z.object({
  contentId: z.string(),
  blockId: z.string(),
  paragraphId: z.string(),
  body: z.string(),
});

const updateSeenCompositionPassageSchema = z.object({
  contentId: z.string(),
  blockId: z.string(),
  recordId: z.string(),
  kind: z.enum(["seen-passage-one", "seen-passage-two"]),
  body: z.string(),
});

const updateThreeFieldBlockSchema = z.object({
  contentId: z.string(),
  blockId: z.string(),
  recordId: z.string(),
  question: z.string(),
  answer: z.string(),
  details: z.string(),
});

const jsonDocumentSchema = z
  .string()
  .max(1_000_000, "Exercise data is too large.")
  .refine((value) => {
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }, "Exercise data is invalid.");

const updateInformationTransferBaseSchema = updateThreeFieldBlockSchema.extend({
  documentJson: jsonDocumentSchema,
});

const updateQuestionAnswerExerciseSchema = z.object({
  contentId: z.string(),
  blockId: z.string(),
  questionAnswerExerciseId: z.string(),
  title: z.string(),
  instruction: z.string(),
  question: z.string(),
  answer: z.string(),
  details: z.string(),
  documentJson: jsonDocumentSchema,
});

const passageLinkSchema = z.object({
  passage: z.string(),
  passageSource: z.enum(["manual", "paragraph"]),
  paragraphBlockId: z.string().nullable(),
});

const updateInformationTransferSchema = updateInformationTransferBaseSchema.extend(passageLinkSchema.shape);

const updatePassageThreeFieldBlockSchema = updateThreeFieldBlockSchema.extend(passageLinkSchema.shape);

const updateMcqSectionSchema = z.object({
  contentId: z.string(),
  blockId: z.string(),
  mcqSectionId: z.string(),
  title: z.string(),
  description: z.string(),
  passage: z.string(),
  passageSource: z.enum(["manual", "paragraph"]),
  paragraphBlockId: z.string().nullable(),
  documentJson: jsonDocumentSchema,
});

const updateSynonymsAntonymsPassageSchema = z.object({
  contentId: z.string(),
  blockId: z.string(),
  synonymsAntonymsId: z.string(),
  passage: z.string(),
  passageSource: z.enum(["manual", "paragraph"]),
  paragraphBlockId: z.string().nullable(),
});

const updateTrueFalseExerciseSchema = z.object({
  contentId: z.string(),
  blockId: z.string(),
  trueFalseExerciseId: z.string(),
  title: z.string(),
  instruction: z.string(),
  passage: z.string(),
  documentJson: jsonDocumentSchema,
});

const vocabularyWordSchema = z.string().trim().min(1, "Word is required.").max(300, "Word is too long.");
const vocabularyMeaningSchema = z.string().trim().min(1, "Meaning is required.").max(4000, "Meaning is too long.");
const vocabularyWordUpdateSchema = z.string().trim().max(300, "Word is too long.");
const vocabularyMeaningUpdateSchema = z.string().trim().max(4000, "Meaning is too long.");

const createVocabularyEntrySchema = z.object({
  contentId: z.string().min(1),
  blockId: z.string().min(1),
  vocabularyId: z.string().min(1),
  word: vocabularyWordSchema,
  meaning: vocabularyMeaningSchema,
});

const updateVocabularyEntrySchema = z.object({
  contentId: z.string().min(1),
  blockId: z.string().min(1),
  vocabularyEntryId: z.string().min(1),
  word: vocabularyWordUpdateSchema,
  meaning: vocabularyMeaningUpdateSchema,
});

const updateVocabularyPassageSchema = z.object({
  contentId: z.string(),
  blockId: z.string(),
  vocabularyId: z.string(),
  passage: z.string(),
  passageSource: z.enum(["manual", "paragraph"]),
  paragraphBlockId: z.string().nullable(),
});

const synonymsWordSchema = z.string().trim().min(1, "Word is required.").max(300, "Word is too long.");
const synonymsMeaningSchema = z.string().trim().min(1, "Meaning is required.").max(4000, "Meaning is too long.");
const synonymsWordUpdateSchema = z.string().trim().max(300, "Word is too long.");
const synonymsMeaningUpdateSchema = z.string().trim().max(4000, "Meaning is too long.");
const optionalEntryTextSchema = z.string().trim().max(20_000, "Entry text is too long.");

const createSynonymsAntonymsEntrySchema = z.object({
  contentId: z.string().min(1),
  blockId: z.string().min(1),
  synonymsAntonymsId: z.string().min(1),
  word: synonymsWordSchema,
  meanings: synonymsMeaningSchema,
  synonyms: optionalEntryTextSchema,
  antonyms: optionalEntryTextSchema,
  details: z.string().max(200_000, "Details are too long."),
});

const updateSynonymsAntonymsEntrySchema = z.object({
  contentId: z.string().min(1),
  blockId: z.string().min(1),
  synonymsAntonymsEntryId: z.string().min(1),
  word: synonymsWordUpdateSchema,
  meanings: synonymsMeaningUpdateSchema,
  synonyms: optionalEntryTextSchema,
  antonyms: optionalEntryTextSchema,
  details: z.string().max(200_000, "Details are too long."),
});

function assertCrudUpdateValidation(
  previousErrors: Record<string, string>,
  nextErrors: Record<string, string>,
) {
  const first = firstCrudValidationError(nextErrors);
  if (first && crudValidationWouldRegress(previousErrors, nextErrors)) {
    throw new Error(first);
  }
}

async function getOwnedContent(contentId: string, organizationId: string) {
  const content = await prisma.content.findFirst({
    where: {
      id: contentId,
      organizationId,
    },
    select: {
      id: true,
      classId: true,
      subjectId: true,
      unitId: true,
      lessonId: true,
      topicId: true,
    },
  });

  if (!content) {
    throw new Error("Content not found.");
  }

  return content;
}

async function getOwnedContentBlock(blockId: string, organizationId: string) {
  const block = await prisma.contentBlock.findFirst({
    where: {
      id: blockId,
      content: {
        organizationId,
      },
    },
    select: {
      id: true,
      contentId: true,
      kind: true,
    },
  });

  if (!block) {
    throw new Error("Content block not found.");
  }

  return block;
}

async function assertBoardYearSelection(
  boardId: string | null,
  academicYearId: string | null,
  organizationId: string,
) {
  const [board, academicYear] = await Promise.all([
    boardId
      ? prisma.board.findFirst({
          where: { id: boardId, organizationId },
          select: { id: true },
        })
      : Promise.resolve(null),
    academicYearId
      ? prisma.academicYear.findFirst({
          where: { id: academicYearId, organizationId },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (boardId && !board) throw new Error("Selected board was not found.");
  if (academicYearId && !academicYear) throw new Error("Selected year was not found.");
}

async function assertHierarchyPath(
  input: z.infer<typeof contentSchema>,
  organizationId: string,
) {
  const classItem = await prisma.class.findFirst({
    where: { id: input.classId, organizationId },
    select: { id: true },
  });

  if (!classItem) {
    throw new Error("Class is not available for this organization.");
  }

  const subject = await prisma.subject.findFirst({
    where: {
      id: input.subjectId,
      classId: input.classId,
      organizationId,
    },
    select: { id: true },
  });

  if (!subject) {
    throw new Error("Subject does not belong to class.");
  }

  const unit = await prisma.unit.findFirst({
    where: {
      id: input.unitId,
      classId: input.classId,
      subjectId: input.subjectId,
      organizationId,
    },
    select: { id: true },
  });

  if (!unit) {
    throw new Error("Unit does not belong to class and subject.");
  }

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: input.lessonId,
      unitId: input.unitId,
      organizationId,
    },
    select: { id: true },
  });

  if (!lesson) {
    throw new Error("Lesson does not belong to unit.");
  }

  if (input.topicId) {
    const topic = await prisma.topic.findFirst({
      where: {
        id: input.topicId,
        lessonId: input.lessonId,
        organizationId,
      },
      select: { id: true },
    });

    if (!topic) {
      throw new Error("Topic does not belong to lesson.");
    }
  }
}

async function assertParagraphLink(params: {
  contentId: string;
  paragraphBlockId: string | null;
  passageSource: "manual" | "paragraph";
  organizationId: string;
}) {
  if (params.passageSource !== "paragraph") return;
  if (!params.paragraphBlockId) {
    throw new Error("A Passage block must be selected.");
  }

  if (isSeenPassageRef(params.paragraphBlockId)) {
    const content = await prisma.content.findFirst({
      where: { id: params.contentId, organizationId: params.organizationId },
      select: { id: true },
    });
    if (!content) {
      throw new Error("Selected Passage does not belong to this content.");
    }
    return;
  }

  const paragraphBlock = await prisma.contentBlock.findFirst({
    where: {
      id: params.paragraphBlockId,
      contentId: params.contentId,
      kind: { in: ["paragraph", "seen-passage-one", "seen-passage-two"] },
      content: { organizationId: params.organizationId },
    },
    select: { id: true },
  });

  if (!paragraphBlock) {
    throw new Error("Selected Passage does not belong to this content.");
  }
}

async function assertUniqueContentPath(input: z.infer<typeof contentSchema> & { organizationId: string }) {
  const duplicate = await prisma.content.findFirst({
    where: {
      classId: input.classId,
      subjectId: input.subjectId,
      unitId: input.unitId,
      lessonId: input.lessonId,
      topicId: input.topicId || null,
      organizationId: input.organizationId,
      NOT: input.id ? { id: input.id } : undefined,
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new Error("Content already exists for this path.");
  }
}

function createQuestionAnswerDocument() {
  return { rows: [] };
}

function createColumnMatchingDocument() {
  return {
    version: 2,
    columns: [
      { id: crypto.randomUUID(), label: "Column A", sortOrder: 0 },
      { id: crypto.randomUUID(), label: "Column B", sortOrder: 1 },
    ],
    rows: [],
    answers: [],
  };
}

function createTrueFalseDocument() {
  // Row creation is handled by the validated Add statement popup. New blocks
  // should not start with a blank placeholder row that bypasses that flow.
  return { rows: [] };
}

export async function saveContent(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = contentSchema.parse(input);

  await assertHierarchyPath(parsed, user.organizationId);
  await assertUniqueContentPath({ ...parsed, organizationId: user.organizationId });

  if (parsed.id) {
    await getOwnedContent(parsed.id, user.organizationId);

    const updated = await prisma.$transaction(async (tx) => {
      const hierarchyData = {
        classId: parsed.classId,
        subjectId: parsed.subjectId,
        unitId: parsed.unitId,
        lessonId: parsed.lessonId,
        topicId: parsed.topicId || null,
        updatedBy: user.id,
      };

      const contentData = {
        ...hierarchyData,
        ...(parsed.title !== undefined ? { title: parsed.title } : {}),
      };

      const content = await tx.content.update({
        where: { id: parsed.id, organizationId: user.organizationId },
        data: contentData,
      });

      await Promise.all([
        tx.paragraph.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),
        tx.seenPassageOne.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),
        tx.seenPassageTwo.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),
        tx.vocabulary.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),
        tx.synonymsAntonyms.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),
        tx.gapFillExercise.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),
        tx.gapFillFirstPaper.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),
        tx.gapFillSecondPaper.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),
        tx.mcqSection.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),
        tx.questionAnswerExercise.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),
        tx.tableCompletionExercise.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),
        tx.columnMatchingExercise.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),
        tx.rearrangeSentenceExercise.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),
        tx.questionFromPoems.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),
        tx.questionFromStory.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),
        tx.trueFalseExercise.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),
        tx.informationTransfer.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),
        tx.substitutionTable.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),
        tx.rightFormOfVerb.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),
        tx.narration.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),
        tx.changingSentence.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),
        tx.punctuationAndCapitalization.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),
        tx.preposition.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),
        tx.suffixAndPrefix.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),
        tx.tagQuestion.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),
        tx.connector.updateMany({ where: { contentId: parsed.id, organizationId: user.organizationId }, data: hierarchyData }),
      ]);

      return content;
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: "UPDATE",
      entityName: "Content",
      entityId: updated.id,
      changes: updated,
      organizationId: user.organizationId,
    });
  } else {
    const created = await prisma.content.create({
      data: {
        title: parsed.title || "",
        classId: parsed.classId,
        subjectId: parsed.subjectId,
        unitId: parsed.unitId,
        lessonId: parsed.lessonId,
        topicId: parsed.topicId || null,
        organizationId: user.organizationId,
        createdBy: user.id,
        updatedBy: user.id,
      },
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: "CREATE",
      entityName: "Content",
      entityId: created.id,
      changes: created,
      organizationId: user.organizationId,
    });
  }

  revalidatePath("/admin/content");
}


export async function updateContentTitle(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = contentTitleSchema.parse(input);
  const owned = await getOwnedContent(parsed.id, user.organizationId);

  const updated = await prisma.content.update({
    where: { id: parsed.id, organizationId: user.organizationId },
    data: {
      title: parsed.title,
      updatedBy: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entityName: "Content",
    entityId: updated.id,
    changes: { title: updated.title },
    organizationId: user.organizationId,
  });

  revalidatePath(`/admin/content/${parsed.id}`);
  revalidatePath(`/admin/content/class/${owned.classId}/subject/${owned.subjectId}/seen-composition`);

  return { id: updated.id, title: updated.title };
}

export async function deleteContent(id: string) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const owned = await getOwnedContent(id, user.organizationId);
  const vocabularyEntries = await prisma.vocabularyEntry.findMany({
    where: {
      organizationId: user.organizationId,
      vocabulary: { contentId: id, organizationId: user.organizationId },
    },
    select: { id: true, imageUrl: true, imagePath: true },
  });
  const vocabularyEntryIds = vocabularyEntries.map((entry) => entry.id);
  const trackedVocabularyFiles = vocabularyEntryIds.length > 0
    ? await prisma.uploadedFile.findMany({
        where: {
          organizationId: user.organizationId,
          purpose: VOCABULARY_IMAGE_PURPOSE,
          vocabularyEntryId: { in: vocabularyEntryIds },
          isCurrent: true,
          status: "active",
        },
        select: { id: true, path: true, url: true },
      })
    : [];

  // Delete every block payload explicitly inside the same transaction before
  // deleting ContentBlock and Content. The Prisma schema also uses ON DELETE
  // CASCADE, but the explicit cleanup protects older repaired SQLite databases
  // from leaving legacy/orphan rows behind.
  const deleted = await prisma.$transaction(async (tx) => {
    const where = { contentId: id, organizationId: user.organizationId };

    await tx.paragraph.deleteMany({ where });
    await tx.seenPassageOne.deleteMany({ where });
    await tx.seenPassageTwo.deleteMany({ where });
    if (trackedVocabularyFiles.length > 0) {
      await tx.uploadedFile.updateMany({
        where: {
          id: { in: trackedVocabularyFiles.map((file) => file.id) },
          organizationId: user.organizationId,
        },
        data: {
          status: "deleted",
          isCurrent: false,
          deletedAt: new Date(),
          updatedBy: user.id,
        },
      });
    }

    await tx.vocabularyEntry.deleteMany({
      where: {
        organizationId: user.organizationId,
        vocabulary: { contentId: id, organizationId: user.organizationId },
      },
    });
    await tx.vocabulary.deleteMany({ where });
    await tx.synonymsAntonyms.deleteMany({ where });
    await tx.gapFillExercise.deleteMany({ where });
    await tx.gapFillFirstPaper.deleteMany({ where });
    await tx.gapFillSecondPaper.deleteMany({ where });
    await tx.mcqSection.deleteMany({ where });
    await tx.questionAnswerExercise.deleteMany({ where });
    await tx.tableCompletionExercise.deleteMany({ where });
    await tx.columnMatchingExercise.deleteMany({ where });
    await tx.rearrangeSentenceExercise.deleteMany({ where });
    await tx.questionFromPoems.deleteMany({ where });
    await tx.questionFromStory.deleteMany({ where });
    await tx.trueFalseExercise.deleteMany({ where });
    await tx.informationTransfer.deleteMany({ where });
    await tx.substitutionTable.deleteMany({ where });
    await tx.rightFormOfVerb.deleteMany({ where });
    await tx.narration.deleteMany({ where });
    await tx.changingSentence.deleteMany({ where });
    await tx.punctuationAndCapitalization.deleteMany({ where });
    await tx.preposition.deleteMany({ where });
    await tx.suffixAndPrefix.deleteMany({ where });
    await tx.tagQuestion.deleteMany({ where });
    await tx.connector.deleteMany({ where });

    await tx.contentBlock.deleteMany({ where: { contentId: id } });

    return tx.content.delete({
      where: { id, organizationId: user.organizationId },
    });
  });

  await deleteTrackedVocabularyStorage(
    trackedVocabularyFiles,
    vocabularyEntries.map((entry) => entry.imagePath || entry.imageUrl).filter(Boolean),
    user.organizationId,
    user.id,
  );

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "DELETE",
    entityName: "Content",
    entityId: deleted.id,
    changes: deleted,
    organizationId: user.organizationId,
  });

  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/class/${owned.classId}/subject/${owned.subjectId}`);
  revalidatePath(`/admin/content/class/${owned.classId}/subject/${owned.subjectId}/seen-composition`);
}

export async function createContentBlock(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = createBlockSchema.parse(input);

  const content = await getOwnedContent(parsed.contentId, user.organizationId);

  const block = await prisma.$transaction(async (tx) => {
    const latestBlock = await tx.contentBlock.aggregate({
      where: { contentId: parsed.contentId },
      _max: { sortOrder: true },
    });

    const createdBlock = await tx.contentBlock.create({
      data: {
        contentId: parsed.contentId,
        kind: parsed.kind,
        sortOrder: (latestBlock._max.sortOrder ?? -1) + 1,
      },
    });

    const baseData = {
      contentBlockId: createdBlock.id,
      contentId: parsed.contentId,
      classId: content.classId,
      subjectId: content.subjectId,
      unitId: content.unitId,
      lessonId: content.lessonId,
      topicId: content.topicId,
      organizationId: user.organizationId,
      createdBy: user.id,
      updatedBy: user.id,
    };

    switch (parsed.kind) {
      case "paragraph":
        await tx.paragraph.create({
          data: {
            ...baseData,
            body: "",
          },
        });
        break;

      case "seen-passage-one":
        await tx.seenPassageOne.create({
          data: {
            ...baseData,
            body: "",
          },
        });
        break;

      case "seen-passage-two":
        await tx.seenPassageTwo.create({
          data: {
            ...baseData,
            body: "",
          },
        });
        break;

      case "vocabulary":
        // Item CRUD is handled through the validated Add word popup. Do not
        // create a blank placeholder row that can bypass create validation.
        await tx.vocabulary.create({ data: baseData });
        break;

      case "synonyms-antonyms":
        // Keep a new block empty until the validated Add row popup creates the
        // first real entry.
        await tx.synonymsAntonyms.create({ data: baseData });
        break;

      case "gap-fill":
        await tx.gapFillExercise.create({
          data: {
            ...baseData,
            question: "",
            answer: "",
            details: "",
          },
        });
        break;

      case "gap-fill-first-paper":
        await tx.gapFillFirstPaper.create({
          data: {
            ...baseData,
            question: "",
            answer: "",
            details: "",
          },
        });
        break;

      case "gap-fill-second-paper":
        await tx.gapFillSecondPaper.create({
          data: {
            ...baseData,
            question: "",
            answer: "",
            details: "",
          },
        });
        break;

      case "mcq":
        await tx.mcqSection.create({
          data: {
            ...baseData,
            title: "Multiple choice questions",
            description: "",
            documentJson: JSON.stringify({
              questions: [],
            }),
          },
        });
        break;

      case "true-false":
        await tx.trueFalseExercise.create({
          data: {
            ...baseData,
            title: "True / False",
            instruction: "Write your own statements based on the passage. If false, include the correct statement.",
            passage: "",
            documentJson: JSON.stringify(createTrueFalseDocument()),
          },
        });
        break;

      case "question-answer":
        await tx.questionAnswerExercise.create({
          data: {
            ...baseData,
            title: "",
            instruction: "",
            question: "",
            answer: "",
            details: "",
            documentJson: JSON.stringify(createQuestionAnswerDocument()),
          },
        });
        break;

      case "table-completion":
        await tx.tableCompletionExercise.create({
          data: {
            ...baseData,
            title: "",
            instruction: "",
            question: "",
            answer: "",
            details: "",
            documentJson: JSON.stringify(createQuestionAnswerDocument()),
          },
        });
        break;

      case "column-matching":
        await tx.columnMatchingExercise.create({
          data: {
            ...baseData,
            title: "Matching Sentences",
            instruction: "",
            question: "",
            answer: "",
            details: "",
            documentJson: JSON.stringify(createColumnMatchingDocument()),
          },
        });
        break;

      case "rearrange-sentence":
        await tx.rearrangeSentenceExercise.create({
          data: {
            ...baseData,
            title: "Rearrange sentence",
            instruction: "Rearrange the following sentences in the correct order.",
            question: "",
            answer: "",
            details: "",
            documentJson: JSON.stringify(createQuestionAnswerDocument()),
          },
        });
        break;

      case "question-from-poems":
        await tx.questionFromPoems.create({
          data: {
            ...baseData,
            title: "",
            instruction: "",
            question: "",
            answer: "",
            details: "",
            documentJson: JSON.stringify({ version: 2, rows: [] }),
          },
        });
        break;

      case "question-from-story":
        await tx.questionFromStory.create({
          data: {
            ...baseData,
            title: "",
            instruction: "",
            question: "",
            answer: "",
            details: "",
            documentJson: JSON.stringify({ version: 2, rows: [] }),
          },
        });
        break;

      case "information-transfer":
        await tx.informationTransfer.create({
          data: {
            ...baseData,
            question: "",
            answer: "",
            details: "",
            documentJson: JSON.stringify({ version: 1, blanks: [] }),
          },
        });
        break;

      case "substitution-table":
        await tx.substitutionTable.create({
          data: {
            ...baseData,
            question: "",
            answer: "",
            details: "",
          },
        });
        break;

      case "right-form-of-verb":
        await tx.rightFormOfVerb.create({
          data: {
            ...baseData,
            question: "",
            answer: "",
            details: "",
          },
        });
        break;

      case "narration":
        await tx.narration.create({
          data: {
            ...baseData,
            question: "",
            answer: "",
            details: "",
          },
        });
        break;

      case "changing-sentence":
        await tx.changingSentence.create({
          data: {
            ...baseData,
            question: "",
            answer: "",
            details: "",
          },
        });
        break;

      case "punctuation-and-capitalization":
        await tx.punctuationAndCapitalization.create({
          data: {
            ...baseData,
            question: "",
            answer: "",
            details: "",
          },
        });
        break;

      case "preposition":
        await tx.preposition.create({
          data: {
            ...baseData,
            question: "",
            answer: "",
            details: "",
          },
        });
        break;

      case "suffix-and-prefix":
        await tx.suffixAndPrefix.create({
          data: {
            ...baseData,
            question: "",
            answer: "",
            details: "",
          },
        });
        break;

      case "tag-question":
        await tx.tagQuestion.create({
          data: {
            ...baseData,
            question: "",
            answer: "",
            details: "",
          },
        });
        break;

      case "connector":
        await tx.connector.create({
          data: {
            ...baseData,
            question: "",
            answer: "",
            details: "",
          },
        });
        break;
    }

    return createdBlock;
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "CREATE",
    entityName: "ContentBlock",
    entityId: block.id,
    changes: block,
    organizationId: user.organizationId,
  });

  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/${parsed.contentId}`);
}

export async function updateContentBlockBoardYear(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = blockBoardYearSchema.parse(input);
  const ownedBlock = await getOwnedContentBlock(parsed.blockId, user.organizationId);

  await assertBoardYearSelection(parsed.boardId, parsed.academicYearId, user.organizationId);

  const updated = await prisma.contentBlock.update({
    where: { id: ownedBlock.id },
    data: {
      boardId: parsed.boardId,
      academicYearId: parsed.academicYearId,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entityName: "ContentBlock",
    entityId: updated.id,
    changes: {
      boardId: updated.boardId,
      academicYearId: updated.academicYearId,
    },
    organizationId: user.organizationId,
  });

  revalidatePath(`/admin/content/${ownedBlock.contentId}`);
  return {
    boardId: updated.boardId,
    academicYearId: updated.academicYearId,
  };
}

export async function reorderContentBlocks(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = reorderBlocksSchema.parse(input);

  const ownedBlocks = await prisma.contentBlock.findMany({
    where: {
      id: { in: parsed.map((item) => item.id) },
      content: {
        organizationId: user.organizationId,
      },
    },
    select: { id: true, contentId: true },
  });

  if (ownedBlocks.length !== parsed.length) {
    throw new Error("One or more content blocks are not accessible.");
  }

  await prisma.$transaction(
    parsed.map((item) =>
      prisma.contentBlock.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      }),
    ),
  );

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "REORDER",
    entityName: "ContentBlock",
    entityId: "batch",
    changes: parsed,
    organizationId: user.organizationId,
  });

  revalidatePath("/admin/content");

  for (const contentId of new Set(ownedBlocks.map((item) => item.contentId))) {
    revalidatePath(`/admin/content/${contentId}`);
  }
}

export async function deleteContentBlock(blockId: string) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const ownedBlock = await getOwnedContentBlock(blockId, user.organizationId);
  const vocabularyEntries = ownedBlock.kind === "vocabulary"
    ? await prisma.vocabularyEntry.findMany({
        where: {
          organizationId: user.organizationId,
          vocabulary: { contentBlockId: blockId, organizationId: user.organizationId },
        },
        select: { id: true, imageUrl: true, imagePath: true },
      })
    : [];
  const vocabularyEntryIds = vocabularyEntries.map((entry) => entry.id);
  const trackedVocabularyFiles = vocabularyEntryIds.length > 0
    ? await prisma.uploadedFile.findMany({
        where: {
          organizationId: user.organizationId,
          purpose: VOCABULARY_IMAGE_PURPOSE,
          vocabularyEntryId: { in: vocabularyEntryIds },
          isCurrent: true,
          status: "active",
        },
        select: { id: true, path: true, url: true },
      })
    : [];

  const deleted = await prisma.$transaction(async (tx) => {
    const isPassageBlock = ["paragraph", "seen-passage-one", "seen-passage-two"].includes(ownedBlock.kind);

    if (isPassageBlock) {
      let preservedPassage = "";
      let legacyReference: string | null = null;

      if (ownedBlock.kind === "paragraph") {
        const paragraph = await tx.paragraph.findUnique({
          where: { contentBlockId: blockId },
          select: { body: true },
        });
        preservedPassage = paragraph?.body || "";
      } else if (ownedBlock.kind === "seen-passage-one") {
        const passage = await tx.seenPassageOne.findUnique({
          where: { contentBlockId: blockId },
          select: { body: true },
        });
        preservedPassage = passage?.body || "";
        legacyReference = SEEN_PASSAGE_ONE_REF;
      } else {
        const passage = await tx.seenPassageTwo.findUnique({
          where: { contentBlockId: blockId },
          select: { body: true },
        });
        preservedPassage = passage?.body || "";
        legacyReference = SEEN_PASSAGE_TWO_REF;
      }

      const linkedIds = legacyReference ? [blockId, legacyReference] : [blockId];
      const linkWhere = {
        contentId: ownedBlock.contentId,
        paragraphBlockId: { in: linkedIds },
        organizationId: user.organizationId,
      };
      const linkData = {
        passage: preservedPassage,
        passageSource: "manual",
        paragraphBlockId: null,
        updatedBy: user.id,
      };

      await Promise.all([
        tx.vocabulary.updateMany({ where: linkWhere, data: linkData }),
        tx.synonymsAntonyms.updateMany({ where: linkWhere, data: linkData }),
        tx.gapFillExercise.updateMany({ where: linkWhere, data: linkData }),
        tx.gapFillFirstPaper.updateMany({ where: linkWhere, data: linkData }),
        tx.mcqSection.updateMany({ where: linkWhere, data: linkData }),
        tx.informationTransfer.updateMany({ where: linkWhere, data: linkData }),
      ]);

      const questionAnswers = await tx.questionAnswerExercise.findMany({
        where: { contentId: ownedBlock.contentId, organizationId: user.organizationId },
        select: { id: true, documentJson: true },
      });
      for (const exercise of questionAnswers) {
        try {
          const document = JSON.parse(exercise.documentJson || "{}") as Record<string, unknown>;
          if (typeof document.paragraphBlockId !== "string" || !linkedIds.includes(document.paragraphBlockId)) continue;
          await tx.questionAnswerExercise.update({
            where: { id: exercise.id },
            data: {
              documentJson: JSON.stringify({ ...document, passageSource: "manual", paragraphBlockId: null }),
              updatedBy: user.id,
            },
          });
        } catch {
          // Keep malformed legacy documents untouched; the existing compatibility parser will handle them.
        }
      }

      if (ownedBlock.kind === "seen-passage-one") {
        await tx.seenPassageOne.deleteMany({ where: { contentBlockId: blockId } });
      } else if (ownedBlock.kind === "seen-passage-two") {
        await tx.seenPassageTwo.deleteMany({ where: { contentBlockId: blockId } });
      }
    }

    if (ownedBlock.kind === "vocabulary") {
      const vocabulary = await tx.vocabulary.findUnique({
        where: { contentBlockId: blockId },
        select: { id: true },
      });
      if (vocabulary) {
        if (trackedVocabularyFiles.length > 0) {
          await tx.uploadedFile.updateMany({
            where: {
              id: { in: trackedVocabularyFiles.map((file) => file.id) },
              organizationId: user.organizationId,
            },
            data: {
              status: "deleted",
              isCurrent: false,
              deletedAt: new Date(),
              updatedBy: user.id,
            },
          });
        }

        await tx.vocabularyEntry.deleteMany({
          where: { vocabularyId: vocabulary.id, organizationId: user.organizationId },
        });
        await tx.vocabulary.delete({ where: { id: vocabulary.id } });
      }
    }

    return tx.contentBlock.delete({
      where: { id: blockId, contentId: ownedBlock.contentId },
    });
  });

  await deleteTrackedVocabularyStorage(
    trackedVocabularyFiles,
    vocabularyEntries.map((entry) => entry.imagePath || entry.imageUrl).filter(Boolean),
    user.organizationId,
    user.id,
  );

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "DELETE",
    entityName: "ContentBlock",
    entityId: deleted.id,
    changes: deleted,
    organizationId: user.organizationId,
  });

  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/${ownedBlock.contentId}`);
}

export async function updateParagraphBlock(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = updateParagraphSchema.parse(input);
  const ownedBlock = await getOwnedContentBlock(parsed.blockId, user.organizationId);

  if (ownedBlock.contentId !== parsed.contentId || ownedBlock.kind !== "paragraph") {
    throw new Error("Paragraph block does not belong to content.");
  }

  const content = await getOwnedContent(parsed.contentId, user.organizationId);

  const updated = await prisma.paragraph.upsert({
    where: { contentBlockId: parsed.blockId },
    update: {
      body: parsed.body,
      updatedBy: user.id,
    },
    create: {
      contentBlockId: parsed.blockId,
      contentId: parsed.contentId,
      classId: content.classId,
      subjectId: content.subjectId,
      unitId: content.unitId,
      lessonId: content.lessonId,
      topicId: content.topicId,
      body: parsed.body,
      organizationId: user.organizationId,
      createdBy: user.id,
      updatedBy: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entityName: "Paragraph",
    entityId: updated.id,
    changes: updated,
    organizationId: user.organizationId,
  });

  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/${parsed.contentId}`);
}

export async function updateSeenCompositionPassage(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = updateSeenCompositionPassageSchema.parse(input);
  const ownedBlock = await getOwnedContentBlock(parsed.blockId, user.organizationId);

  if (ownedBlock.contentId !== parsed.contentId || ownedBlock.kind !== parsed.kind) {
    throw new Error("Passage block does not belong to this content.");
  }

  const content = await getOwnedContent(parsed.contentId, user.organizationId);
  const baseData = {
    contentBlockId: parsed.blockId,
    contentId: parsed.contentId,
    classId: content.classId,
    subjectId: content.subjectId,
    unitId: content.unitId,
    lessonId: content.lessonId,
    topicId: content.topicId,
    body: parsed.body,
    organizationId: user.organizationId,
    createdBy: user.id,
    updatedBy: user.id,
  };

  const updated = parsed.kind === "seen-passage-one"
    ? await prisma.seenPassageOne.upsert({
        where: { contentBlockId: parsed.blockId },
        update: { body: parsed.body, updatedBy: user.id },
        create: baseData,
      })
    : await prisma.seenPassageTwo.upsert({
        where: { contentBlockId: parsed.blockId },
        update: { body: parsed.body, updatedBy: user.id },
        create: baseData,
      });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entityName: parsed.kind === "seen-passage-one" ? "SeenPassageOne" : "SeenPassageTwo",
    entityId: updated.id,
    changes: updated,
    organizationId: user.organizationId,
  });

  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/${parsed.contentId}`);
}

export async function updateQuestionAnswerExercise(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = updateQuestionAnswerExerciseSchema.parse(input);

  const block = await prisma.contentBlock.findFirst({
    where: {
      id: parsed.blockId,
      contentId: parsed.contentId,
      content: { organizationId: user.organizationId },
    },
    select: {
      kind: true,
      questionAnswerExercise: { select: { documentJson: true } },
      rearrangeSentenceExercise: { select: { documentJson: true } },
      questionFromPoems: { select: { documentJson: true } },
      questionFromStory: { select: { documentJson: true } },
    },
  });

  if (!block || !["question-answer", "table-completion", "column-matching", "rearrange-sentence", "question-from-poems", "question-from-story"].includes(block.kind)) {
    throw new Error("Exercise block not found.");
  }

  if (["question-answer", "rearrange-sentence", "question-from-poems", "question-from-story"].includes(block.kind)) {
    const previousDocumentJson =
      block.kind === "question-answer"
        ? block.questionAnswerExercise?.documentJson
        : block.kind === "rearrange-sentence"
          ? block.rearrangeSentenceExercise?.documentJson
          : block.kind === "question-from-poems"
            ? block.questionFromPoems?.documentJson
            : block.questionFromStory?.documentJson;

    assertCrudUpdateValidation(
      validateQuestionAnswerDocumentJson(block.kind, previousDocumentJson || "{}"),
      validateQuestionAnswerDocumentJson(block.kind, parsed.documentJson),
    );
  }

  const data = {
    title: parsed.title,
    instruction: parsed.instruction,
    question: parsed.question,
    answer: parsed.answer,
    details: parsed.details,
    documentJson: parsed.documentJson,
    updatedBy: user.id,
  };

  let updated: { id: string };
  let entityName: string;

  switch (block.kind) {
    case "question-answer":
      updated = await prisma.questionAnswerExercise.update({
        where: {
          id: parsed.questionAnswerExerciseId,
          contentBlockId: parsed.blockId,
          organizationId: user.organizationId,
        },
        data,
      });
      entityName = "QuestionAnswerExercise";
      break;
    case "table-completion":
      updated = await prisma.tableCompletionExercise.update({
        where: {
          id: parsed.questionAnswerExerciseId,
          contentBlockId: parsed.blockId,
          organizationId: user.organizationId,
        },
        data,
      });
      entityName = "TableCompletionExercise";
      break;
    case "column-matching":
      updated = await prisma.columnMatchingExercise.update({
        where: {
          id: parsed.questionAnswerExerciseId,
          contentBlockId: parsed.blockId,
          organizationId: user.organizationId,
        },
        data,
      });
      entityName = "ColumnMatchingExercise";
      break;
    case "rearrange-sentence":
      updated = await prisma.rearrangeSentenceExercise.update({
        where: {
          id: parsed.questionAnswerExerciseId,
          contentBlockId: parsed.blockId,
          organizationId: user.organizationId,
        },
        data,
      });
      entityName = "RearrangeSentenceExercise";
      break;
    case "question-from-poems":
      updated = await prisma.questionFromPoems.update({
        where: {
          id: parsed.questionAnswerExerciseId,
          contentBlockId: parsed.blockId,
          organizationId: user.organizationId,
        },
        data,
      });
      entityName = "QuestionFromPoems";
      break;
    case "question-from-story":
      updated = await prisma.questionFromStory.update({
        where: {
          id: parsed.questionAnswerExerciseId,
          contentBlockId: parsed.blockId,
          organizationId: user.organizationId,
        },
        data,
      });
      entityName = "QuestionFromStory";
      break;
    default:
      throw new Error("Unsupported exercise block.");
  }

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entityName,
    entityId: updated.id,
    changes: data,
    organizationId: user.organizationId,
  });
}

export async function updateTrueFalseExercise(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = updateTrueFalseExerciseSchema.parse(input);

  const ownedBlock = await getOwnedContentBlock(parsed.blockId, user.organizationId);
  if (ownedBlock.contentId !== parsed.contentId || ownedBlock.kind !== "true-false") {
    throw new Error("True / False block does not belong to content.");
  }

  const existing = await prisma.trueFalseExercise.findFirst({
    where: {
      id: parsed.trueFalseExerciseId,
      contentBlockId: parsed.blockId,
      organizationId: user.organizationId,
    },
    select: { documentJson: true },
  });
  if (!existing) throw new Error("True / False exercise not found.");
  assertCrudUpdateValidation(
    validateTrueFalseDocumentJson(existing.documentJson),
    validateTrueFalseDocumentJson(parsed.documentJson),
  );

  const updated = await prisma.trueFalseExercise.update({
    where: {
      id: parsed.trueFalseExerciseId,
      contentBlockId: parsed.blockId,
      organizationId: user.organizationId,
    },
    data: {
      title: parsed.title,
      instruction: parsed.instruction,
      passage: parsed.passage,
      documentJson: parsed.documentJson,
      updatedBy: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entityName: "TrueFalseExercise",
    entityId: updated.id,
    changes: updated,
    organizationId: user.organizationId,
  });
}

export async function updateMcqSection(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = updateMcqSectionSchema.parse(input);

  const ownedBlock = await getOwnedContentBlock(parsed.blockId, user.organizationId);
  if (ownedBlock.contentId !== parsed.contentId || ownedBlock.kind !== "mcq") {
    throw new Error("MCQ block does not belong to content.");
  }
  const existing = await prisma.mcqSection.findFirst({
    where: {
      id: parsed.mcqSectionId,
      contentBlockId: parsed.blockId,
      organizationId: user.organizationId,
    },
    select: { documentJson: true },
  });
  if (!existing) throw new Error("MCQ section not found.");
  assertCrudUpdateValidation(
    validateMcqDocumentJson(existing.documentJson),
    validateMcqDocumentJson(parsed.documentJson),
  );
  await assertParagraphLink({
    contentId: parsed.contentId,
    paragraphBlockId: parsed.paragraphBlockId,
    passageSource: parsed.passageSource,
    organizationId: user.organizationId,
  });

  const updated = await prisma.mcqSection.update({
    where: {
      id: parsed.mcqSectionId,
      contentBlockId: parsed.blockId,
      organizationId: user.organizationId,
    },
    data: {
      title: parsed.title,
      description: parsed.description,
      passage: parsed.passage,
      passageSource: parsed.passageSource,
      paragraphBlockId: parsed.passageSource === "paragraph" ? parsed.paragraphBlockId : null,
      documentJson: parsed.documentJson,
      updatedBy: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entityName: "McqSection",
    entityId: updated.id,
    changes: updated,
    organizationId: user.organizationId,
  });
}

export async function updateInformationTransfer(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = updateInformationTransferSchema.parse(input);

  const block = await prisma.contentBlock.findFirst({
    where: {
      id: parsed.blockId,
      contentId: parsed.contentId,
      kind: "information-transfer",
      content: { organizationId: user.organizationId },
    },
    select: { id: true },
  });

  if (!block) {
    throw new Error("Information Transfer block not found.");
  }

  const existing = await prisma.informationTransfer.findFirst({
    where: {
      id: parsed.recordId,
      contentBlockId: parsed.blockId,
      organizationId: user.organizationId,
    },
    select: { documentJson: true },
  });
  if (!existing) throw new Error("Information Transfer exercise not found.");
  assertCrudUpdateValidation(
    validateInformationTransferDocumentJson(existing.documentJson),
    validateInformationTransferDocumentJson(parsed.documentJson),
  );

  await assertParagraphLink({
    contentId: parsed.contentId,
    paragraphBlockId: parsed.paragraphBlockId,
    passageSource: parsed.passageSource,
    organizationId: user.organizationId,
  });

  const updated = await prisma.informationTransfer.update({
    where: {
      id: parsed.recordId,
      contentBlockId: parsed.blockId,
      organizationId: user.organizationId,
    },
    data: {
      passage: parsed.passage,
      passageSource: parsed.passageSource,
      paragraphBlockId: parsed.passageSource === "paragraph" ? parsed.paragraphBlockId : null,
      question: parsed.question,
      answer: parsed.answer,
      details: parsed.details,
      documentJson: parsed.documentJson,
      updatedBy: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entityName: "InformationTransfer",
    entityId: updated.id,
    changes: updated,
    organizationId: user.organizationId,
  });
}

export async function updateVocabularyPassage(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = updateVocabularyPassageSchema.parse(input);

  const ownedBlock = await getOwnedContentBlock(parsed.blockId, user.organizationId);
  if (ownedBlock.contentId !== parsed.contentId || ownedBlock.kind !== "vocabulary") {
    throw new Error("Vocabulary block does not belong to content.");
  }

  await assertParagraphLink({
    contentId: parsed.contentId,
    paragraphBlockId: parsed.paragraphBlockId,
    passageSource: parsed.passageSource,
    organizationId: user.organizationId,
  });

  const updated = await prisma.vocabulary.update({
    where: {
      id: parsed.vocabularyId,
      contentBlockId: parsed.blockId,
      contentId: parsed.contentId,
      organizationId: user.organizationId,
    },
    data: {
      passage: parsed.passage,
      passageSource: parsed.passageSource,
      paragraphBlockId: parsed.passageSource === "paragraph" ? parsed.paragraphBlockId : null,
      updatedBy: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entityName: "Vocabulary",
    entityId: updated.id,
    changes: updated,
    organizationId: user.organizationId,
  });

  revalidatePath(`/admin/content/${parsed.contentId}`);
}

export async function createVocabularyEntry(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = createVocabularyEntrySchema.parse(input);

  const ownedBlock = await getOwnedContentBlock(parsed.blockId, user.organizationId);
  if (ownedBlock.contentId !== parsed.contentId || ownedBlock.kind !== "vocabulary") {
    throw new Error("Vocabulary block does not belong to content.");
  }

  const vocabulary = await prisma.vocabulary.findFirst({
    where: {
      id: parsed.vocabularyId,
      contentBlockId: parsed.blockId,
      contentId: parsed.contentId,
      organizationId: user.organizationId,
    },
    select: { id: true },
  });

  if (!vocabulary) {
    throw new Error("Vocabulary block not found.");
  }

  const sortOrder = await prisma.vocabularyEntry.count({
    where: { vocabularyId: parsed.vocabularyId, organizationId: user.organizationId },
  });

  const created = await prisma.vocabularyEntry.create({
    data: {
      vocabularyId: parsed.vocabularyId,
      word: parsed.word,
      meaning: parsed.meaning,
      sortOrder,
      organizationId: user.organizationId,
      createdBy: user.id,
      updatedBy: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "CREATE",
    entityName: "VocabularyEntry",
    entityId: created.id,
    changes: created,
    organizationId: user.organizationId,
  });

  revalidatePath(`/admin/content/${parsed.contentId}`);

  return created;
}

export async function updateVocabularyEntry(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = updateVocabularyEntrySchema.parse(input);

  const ownedBlock = await getOwnedContentBlock(parsed.blockId, user.organizationId);
  if (ownedBlock.contentId !== parsed.contentId || ownedBlock.kind !== "vocabulary") {
    throw new Error("Vocabulary block does not belong to content.");
  }

  const vocabulary = await prisma.vocabulary.findFirst({
    where: { contentBlockId: parsed.blockId, organizationId: user.organizationId },
    select: { id: true },
  });
  if (!vocabulary) throw new Error("Vocabulary block not found.");

  const existingEntry = await prisma.vocabularyEntry.findFirst({
    where: {
      id: parsed.vocabularyEntryId,
      vocabularyId: vocabulary.id,
      organizationId: user.organizationId,
    },
    select: { word: true, meaning: true },
  });
  if (!existingEntry) throw new Error("Vocabulary row not found.");

  // Existing legacy blocks may contain an old blank placeholder row. Allow
  // that row to be repaired one required field at a time, but never allow an
  // update to make a row less complete than it already is.
  const previousRequiredCount = [existingEntry.word, existingEntry.meaning].filter((value) => value.trim()).length;
  const nextRequiredCount = [parsed.word, parsed.meaning].filter((value) => value.trim()).length;
  if (nextRequiredCount < previousRequiredCount || (previousRequiredCount === 2 && nextRequiredCount !== 2)) {
    throw new Error("Word and meaning are required.");
  }

  const updated = await prisma.vocabularyEntry.update({
    where: {
      id: parsed.vocabularyEntryId,
      vocabularyId: vocabulary.id,
      organizationId: user.organizationId,
    },
    data: {
      word: parsed.word,
      meaning: parsed.meaning,
      updatedBy: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entityName: "VocabularyEntry",
    entityId: updated.id,
    changes: updated,
    organizationId: user.organizationId,
  });
}

export async function deleteVocabularyEntry(input: { contentId: string; blockId: string; vocabularyId: string; vocabularyEntryId: string }) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();

  const ownedBlock = await getOwnedContentBlock(input.blockId, user.organizationId);
  if (ownedBlock.contentId !== input.contentId || ownedBlock.kind !== "vocabulary") {
    throw new Error("Vocabulary block does not belong to content.");
  }

  const vocabulary = await prisma.vocabulary.findFirst({
    where: {
      id: input.vocabularyId,
      contentBlockId: input.blockId,
      contentId: input.contentId,
      organizationId: user.organizationId,
    },
    select: { id: true },
  });
  if (!vocabulary) throw new Error("Vocabulary block not found.");

  const entries = await prisma.vocabularyEntry.findMany({
    where: { vocabularyId: vocabulary.id, organizationId: user.organizationId },
    select: { id: true, sortOrder: true, imageUrl: true, imagePath: true },
    orderBy: { sortOrder: "asc" },
  });

  const targetEntry = entries.find((entry) => entry.id === input.vocabularyEntryId);
  if (!targetEntry) {
    throw new Error("Vocabulary row not found.");
  }
  const trackedFiles = await getCurrentVocabularyUploadFiles(
    prisma,
    input.vocabularyEntryId,
    user.organizationId,
  );

  const deleted = await prisma.$transaction(async (tx) => {
    await markCurrentVocabularyUploadsDeleted(tx, {
      vocabularyEntryId: input.vocabularyEntryId,
      organizationId: user.organizationId,
      userId: user.id,
    });

    const removed = await tx.vocabularyEntry.delete({
      where: {
        id: input.vocabularyEntryId,
        vocabularyId: vocabulary.id,
        organizationId: user.organizationId,
      },
    });

    const remaining = entries.filter((entry) => entry.id !== input.vocabularyEntryId);
    for (const [index, entry] of remaining.entries()) {
      await tx.vocabularyEntry.update({
        where: {
          id: entry.id,
          vocabularyId: vocabulary.id,
          organizationId: user.organizationId,
        },
        data: { sortOrder: index, updatedBy: user.id },
      });
    }

    return removed;
  });

  await deleteTrackedVocabularyStorage(
    trackedFiles,
    [targetEntry.imagePath || targetEntry.imageUrl].filter(Boolean),
    user.organizationId,
    user.id,
  );

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "DELETE",
    entityName: "VocabularyEntry",
    entityId: deleted.id,
    changes: {
      ...deleted,
      uploadedFileIds: trackedFiles.map((file) => file.id),
    },
    organizationId: user.organizationId,
  });

  revalidatePath(`/admin/content/${input.contentId}`);
}

export async function updateSynonymsAntonymsPassage(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = updateSynonymsAntonymsPassageSchema.parse(input);

  const ownedBlock = await getOwnedContentBlock(parsed.blockId, user.organizationId);
  if (ownedBlock.contentId !== parsed.contentId || ownedBlock.kind !== "synonyms-antonyms") {
    throw new Error("Synonyms / Antonyms block does not belong to content.");
  }

  await assertParagraphLink({
    contentId: parsed.contentId,
    paragraphBlockId: parsed.paragraphBlockId,
    passageSource: parsed.passageSource,
    organizationId: user.organizationId,
  });

  const updated = await prisma.synonymsAntonyms.update({
    where: {
      id: parsed.synonymsAntonymsId,
      contentBlockId: parsed.blockId,
      organizationId: user.organizationId,
    },
    data: {
      passage: parsed.passage,
      passageSource: parsed.passageSource,
      paragraphBlockId: parsed.passageSource === "paragraph" ? parsed.paragraphBlockId : null,
      updatedBy: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entityName: "SynonymsAntonyms",
    entityId: updated.id,
    changes: updated,
    organizationId: user.organizationId,
  });
}

export async function createSynonymsAntonymsEntry(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = createSynonymsAntonymsEntrySchema.parse(input);

  const ownedBlock = await getOwnedContentBlock(parsed.blockId, user.organizationId);
  if (ownedBlock.contentId !== parsed.contentId || ownedBlock.kind !== "synonyms-antonyms") {
    throw new Error("Synonyms / Antonyms block does not belong to content.");
  }

  const synonymsAntonyms = await prisma.synonymsAntonyms.findFirst({
    where: {
      id: parsed.synonymsAntonymsId,
      contentBlockId: parsed.blockId,
      contentId: parsed.contentId,
      organizationId: user.organizationId,
    },
    select: { id: true },
  });

  if (!synonymsAntonyms) {
    throw new Error("Synonyms / Antonyms block not found.");
  }

  const sortOrder = await prisma.synonymsAntonymsEntry.count({
    where: { synonymsAntonymsId: parsed.synonymsAntonymsId, organizationId: user.organizationId },
  });

  const created = await prisma.synonymsAntonymsEntry.create({
    data: {
      synonymsAntonymsId: parsed.synonymsAntonymsId,
      word: parsed.word,
      meanings: parsed.meanings,
      synonyms: parsed.synonyms,
      antonyms: parsed.antonyms,
      details: parsed.details,
      sortOrder,
      organizationId: user.organizationId,
      createdBy: user.id,
      updatedBy: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "CREATE",
    entityName: "SynonymsAntonymsEntry",
    entityId: created.id,
    changes: created,
    organizationId: user.organizationId,
  });

  revalidatePath(`/admin/content/${parsed.contentId}`);

  return created;
}

export async function updateSynonymsAntonymsEntry(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = updateSynonymsAntonymsEntrySchema.parse(input);

  const ownedBlock = await getOwnedContentBlock(parsed.blockId, user.organizationId);
  if (ownedBlock.contentId !== parsed.contentId || ownedBlock.kind !== "synonyms-antonyms") {
    throw new Error("Synonyms / Antonyms block does not belong to content.");
  }

  const synonymsAntonyms = await prisma.synonymsAntonyms.findFirst({
    where: { contentBlockId: parsed.blockId, organizationId: user.organizationId },
    select: { id: true },
  });
  if (!synonymsAntonyms) throw new Error("Synonyms / Antonyms block not found.");

  const existingEntry = await prisma.synonymsAntonymsEntry.findFirst({
    where: {
      id: parsed.synonymsAntonymsEntryId,
      synonymsAntonymsId: synonymsAntonyms.id,
      organizationId: user.organizationId,
    },
    select: { word: true, meanings: true },
  });
  if (!existingEntry) throw new Error("Synonyms / Antonyms row not found.");

  const previousRequiredCount = [existingEntry.word, existingEntry.meanings].filter((value) => value.trim()).length;
  const nextRequiredCount = [parsed.word, parsed.meanings].filter((value) => value.trim()).length;
  if (nextRequiredCount < previousRequiredCount || (previousRequiredCount === 2 && nextRequiredCount !== 2)) {
    throw new Error("Word and meaning are required.");
  }

  const updated = await prisma.synonymsAntonymsEntry.update({
    where: {
      id: parsed.synonymsAntonymsEntryId,
      synonymsAntonymsId: synonymsAntonyms.id,
      organizationId: user.organizationId,
    },
    data: {
      word: parsed.word,
      meanings: parsed.meanings,
      synonyms: parsed.synonyms,
      antonyms: parsed.antonyms,
      details: parsed.details,
      updatedBy: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entityName: "SynonymsAntonymsEntry",
    entityId: updated.id,
    changes: updated,
    organizationId: user.organizationId,
  });
}

export async function deleteSynonymsAntonymsEntry(input: {
  contentId: string;
  blockId: string;
  synonymsAntonymsId: string;
  synonymsAntonymsEntryId: string;
}) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();

  const ownedBlock = await getOwnedContentBlock(input.blockId, user.organizationId);
  if (ownedBlock.contentId !== input.contentId || ownedBlock.kind !== "synonyms-antonyms") {
    throw new Error("Synonyms / Antonyms block does not belong to content.");
  }

  const synonymsAntonyms = await prisma.synonymsAntonyms.findFirst({
    where: {
      id: input.synonymsAntonymsId,
      contentBlockId: input.blockId,
      contentId: input.contentId,
      organizationId: user.organizationId,
    },
    select: { id: true },
  });
  if (!synonymsAntonyms) throw new Error("Synonyms / Antonyms block not found.");

  const entries = await prisma.synonymsAntonymsEntry.findMany({
    where: { synonymsAntonymsId: synonymsAntonyms.id, organizationId: user.organizationId },
    select: { id: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });

  if (!entries.some((entry) => entry.id === input.synonymsAntonymsEntryId)) {
    throw new Error("Synonyms / Antonyms row not found.");
  }
  const deleted = await prisma.synonymsAntonymsEntry.delete({
    where: {
      id: input.synonymsAntonymsEntryId,
      synonymsAntonymsId: synonymsAntonyms.id,
      organizationId: user.organizationId,
    },
  });

  const remaining = entries.filter((entry) => entry.id !== input.synonymsAntonymsEntryId);
  await prisma.$transaction(
    remaining.map((entry, index) =>
      prisma.synonymsAntonymsEntry.update({
        where: { id: entry.id, synonymsAntonymsId: synonymsAntonyms.id, organizationId: user.organizationId },
        data: { sortOrder: index, updatedBy: user.id },
      }),
    ),
  );

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "DELETE",
    entityName: "SynonymsAntonymsEntry",
    entityId: deleted.id,
    changes: deleted,
    organizationId: user.organizationId,
  });

  revalidatePath(`/admin/content/${input.contentId}`);
}

async function updateThreeFieldRecord(
  input: unknown,
  options: {
    entityName: string;
    expectedKind: z.infer<typeof contentBlockKindSchema>;
    update: (
      parsed: z.infer<typeof updateThreeFieldBlockSchema>,
      userId: string,
      organizationId: string,
    ) => Promise<unknown>;
    validate?: (
      parsed: z.infer<typeof updateThreeFieldBlockSchema>,
      organizationId: string,
    ) => Promise<void> | void;
  },
) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = updateThreeFieldBlockSchema.parse(input);
  const ownedBlock = await getOwnedContentBlock(parsed.blockId, user.organizationId);
  if (ownedBlock.contentId !== parsed.contentId || ownedBlock.kind !== options.expectedKind) {
    throw new Error(`${options.entityName} block does not belong to content.`);
  }
  if (options.validate) await options.validate(parsed, user.organizationId);

  const updated = await options.update(parsed, user.id, user.organizationId);

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entityName: options.entityName,
    entityId: parsed.recordId,
    changes: updated,
    organizationId: user.organizationId,
  });
}

async function updatePassageThreeFieldRecord(
  input: unknown,
  options: {
    entityName: string;
    expectedKind: z.infer<typeof contentBlockKindSchema>;
    update: (
      parsed: z.infer<typeof updatePassageThreeFieldBlockSchema>,
      userId: string,
      organizationId: string,
    ) => Promise<unknown>;
  },
) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = updatePassageThreeFieldBlockSchema.parse(input);
  const ownedBlock = await getOwnedContentBlock(parsed.blockId, user.organizationId);
  if (ownedBlock.contentId !== parsed.contentId || ownedBlock.kind !== options.expectedKind) {
    throw new Error(`${options.entityName} block does not belong to content.`);
  }
  await assertParagraphLink({
    contentId: parsed.contentId,
    paragraphBlockId: parsed.paragraphBlockId,
    passageSource: parsed.passageSource,
    organizationId: user.organizationId,
  });

  const updated = await options.update(parsed, user.id, user.organizationId);

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entityName: options.entityName,
    entityId: parsed.recordId,
    changes: updated,
    organizationId: user.organizationId,
  });
}

export async function updateGapFillExercise(input: unknown) {
  return updatePassageThreeFieldRecord(input, {
    entityName: "GapFillExercise",
    expectedKind: "gap-fill",
    update: (parsed, userId, organizationId) =>
      prisma.gapFillExercise.update({
        where: { id: parsed.recordId, contentBlockId: parsed.blockId, organizationId },
        data: {
          question: parsed.question,
          answer: parsed.answer,
          details: parsed.details,
          passage: parsed.passage,
          passageSource: parsed.passageSource,
          paragraphBlockId: parsed.passageSource === "paragraph" ? parsed.paragraphBlockId : null,
          updatedBy: userId,
        },
      }),
  });
}

export async function updateGapFillFirstPaper(input: unknown) {
  return updatePassageThreeFieldRecord(input, {
    entityName: "GapFillFirstPaper",
    expectedKind: "gap-fill-first-paper",
    update: (parsed, userId, organizationId) =>
      prisma.gapFillFirstPaper.update({
        where: { id: parsed.recordId, contentBlockId: parsed.blockId, organizationId },
        data: {
          question: parsed.question,
          answer: parsed.answer,
          details: parsed.details,
          passage: parsed.passage,
          passageSource: parsed.passageSource,
          paragraphBlockId: parsed.passageSource === "paragraph" ? parsed.paragraphBlockId : null,
          updatedBy: userId,
        },
      }),
  });
}

export async function updateGapFillSecondPaper(input: unknown) {
  return updateThreeFieldRecord(input, {
    entityName: "GapFillSecondPaper",
    expectedKind: "gap-fill-second-paper",
    update: (parsed, userId, organizationId) =>
      prisma.gapFillSecondPaper.update({
        where: { id: parsed.recordId, contentBlockId: parsed.blockId, organizationId },
        data: {
          question: parsed.question,
          answer: parsed.answer,
          details: parsed.details,
          updatedBy: userId,
        },
      }),
  });
}

export async function updateSubstitutionTable(input: unknown) {
  return updateThreeFieldRecord(input, {
    entityName: "SubstitutionTable",
    expectedKind: "substitution-table",
    update: (parsed, userId, organizationId) =>
      prisma.substitutionTable.update({
        where: { id: parsed.recordId, contentBlockId: parsed.blockId, organizationId },
        data: {
          question: parsed.question,
          answer: parsed.answer,
          details: parsed.details,
          updatedBy: userId,
        },
      }),
  });
}

export async function updateRightFormOfVerb(input: unknown) {
  return updateThreeFieldRecord(input, {
    entityName: "RightFormOfVerb",
    expectedKind: "right-form-of-verb",
    update: (parsed, userId, organizationId) =>
      prisma.rightFormOfVerb.update({
        where: { id: parsed.recordId, contentBlockId: parsed.blockId, organizationId },
        data: {
          question: parsed.question,
          answer: parsed.answer,
          details: parsed.details,
          updatedBy: userId,
        },
      }),
  });
}

export async function updateNarration(input: unknown) {
  return updateThreeFieldRecord(input, {
    entityName: "Narration",
    expectedKind: "narration",
    update: (parsed, userId, organizationId) =>
      prisma.narration.update({
        where: { id: parsed.recordId, contentBlockId: parsed.blockId, organizationId },
        data: {
          question: parsed.question,
          answer: parsed.answer,
          details: parsed.details,
          updatedBy: userId,
        },
      }),
  });
}

export async function updateChangingSentence(input: unknown) {
  return updateThreeFieldRecord(input, {
    entityName: "ChangingSentence",
    expectedKind: "changing-sentence",
    validate: async (parsed, organizationId) => {
      const existing = await prisma.changingSentence.findFirst({
        where: { id: parsed.recordId, contentBlockId: parsed.blockId, organizationId },
        select: { answer: true },
      });
      if (!existing) throw new Error("Changing Sentence record not found.");
      assertCrudUpdateValidation(
        validateChangingSentenceAnswerJson(existing.answer),
        validateChangingSentenceAnswerJson(parsed.answer),
      );
    },
    update: (parsed, userId, organizationId) =>
      prisma.changingSentence.update({
        where: { id: parsed.recordId, contentBlockId: parsed.blockId, organizationId },
        data: {
          question: parsed.question,
          answer: parsed.answer,
          details: parsed.details,
          updatedBy: userId,
        },
      }),
  });
}

export async function updatePunctuationAndCapitalization(input: unknown) {
  return updateThreeFieldRecord(input, {
    entityName: "PunctuationAndCapitalization",
    expectedKind: "punctuation-and-capitalization",
    update: (parsed, userId, organizationId) =>
      prisma.punctuationAndCapitalization.update({
        where: { id: parsed.recordId, contentBlockId: parsed.blockId, organizationId },
        data: {
          question: parsed.question,
          answer: parsed.answer,
          details: parsed.details,
          updatedBy: userId,
        },
      }),
  });
}

export async function updatePreposition(input: unknown) {
  return updateThreeFieldRecord(input, {
    entityName: "Preposition",
    expectedKind: "preposition",
    update: (parsed, userId, organizationId) =>
      prisma.preposition.update({
        where: { id: parsed.recordId, contentBlockId: parsed.blockId, organizationId },
        data: {
          question: parsed.question,
          answer: parsed.answer,
          details: parsed.details,
          updatedBy: userId,
        },
      }),
  });
}

export async function updateSuffixAndPrefix(input: unknown) {
  return updateThreeFieldRecord(input, {
    entityName: "SuffixAndPrefix",
    expectedKind: "suffix-and-prefix",
    update: (parsed, userId, organizationId) =>
      prisma.suffixAndPrefix.update({
        where: { id: parsed.recordId, contentBlockId: parsed.blockId, organizationId },
        data: {
          question: parsed.question,
          answer: parsed.answer,
          details: parsed.details,
          updatedBy: userId,
        },
      }),
  });
}

export async function updateTagQuestion(input: unknown) {
  return updateThreeFieldRecord(input, {
    entityName: "TagQuestion",
    expectedKind: "tag-question",
    validate: async (parsed, organizationId) => {
      const existing = await prisma.tagQuestion.findFirst({
        where: { id: parsed.recordId, contentBlockId: parsed.blockId, organizationId },
        select: { answer: true },
      });
      if (!existing) throw new Error("Tag Question record not found.");
      assertCrudUpdateValidation(
        validateTagQuestionAnswerJson(existing.answer),
        validateTagQuestionAnswerJson(parsed.answer),
      );
    },
    update: (parsed, userId, organizationId) =>
      prisma.tagQuestion.update({
        where: { id: parsed.recordId, contentBlockId: parsed.blockId, organizationId },
        data: {
          question: parsed.question,
          answer: parsed.answer,
          details: parsed.details,
          updatedBy: userId,
        },
      }),
  });
}

export async function updateConnector(input: unknown) {
  return updateThreeFieldRecord(input, {
    entityName: "Connector",
    expectedKind: "connector",
    update: (parsed, userId, organizationId) =>
      prisma.connector.update({
        where: { id: parsed.recordId, contentBlockId: parsed.blockId, organizationId },
        data: {
          question: parsed.question,
          answer: parsed.answer,
          details: parsed.details,
          updatedBy: userId,
        },
      }),
  });
}



