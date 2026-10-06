"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin, assertTrustedMutationOrigin } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";
import { SEEN_PASSAGE_ONE_REF, SEEN_PASSAGE_TWO_REF, isSeenPassageRef } from "@/lib/seen-composition-passages";

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

const contentSchema = z.object({
  id: z.string().optional(),
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  unitId: z.string().min(1),
  lessonId: z.string().min(1),
  topicId: z.string().optional(),
});

const createBlockSchema = z.object({
  contentId: z.string().min(1),
  kind: contentBlockKindSchema,
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

const createVocabularyEntrySchema = z.object({
  contentId: z.string(),
  blockId: z.string(),
  vocabularyId: z.string(),
  word: z.string(),
  meaning: z.string(),
});

const updateVocabularyEntrySchema = z.object({
  contentId: z.string(),
  blockId: z.string(),
  vocabularyEntryId: z.string(),
  word: z.string(),
  meaning: z.string(),
});

const updateVocabularyPassageSchema = z.object({
  contentId: z.string(),
  blockId: z.string(),
  vocabularyId: z.string(),
  passage: z.string(),
  passageSource: z.enum(["manual", "paragraph"]),
  paragraphBlockId: z.string().nullable(),
});

const createSynonymsAntonymsEntrySchema = z.object({
  contentId: z.string(),
  blockId: z.string(),
  synonymsAntonymsId: z.string(),
  word: z.string(),
  meanings: z.string(),
  synonyms: z.string(),
  antonyms: z.string(),
  details: z.string(),
});

const updateSynonymsAntonymsEntrySchema = z.object({
  contentId: z.string(),
  blockId: z.string(),
  synonymsAntonymsEntryId: z.string(),
  word: z.string(),
  meanings: z.string(),
  synonyms: z.string(),
  antonyms: z.string(),
  details: z.string(),
});

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
  return {
    rows: [
      {
        id: crypto.randomUUID(),
        sortOrder: 0,
        statement: "",
        expectedAnswer: true,
        correction: "",
      },
    ],
  };
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

      const content = await tx.content.update({
        where: { id: parsed.id, organizationId: user.organizationId },
        data: hierarchyData,
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

export async function deleteContent(id: string) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  await getOwnedContent(id, user.organizationId);

  const deleted = await prisma.content.delete({
    where: { id, organizationId: user.organizationId },
  });

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

      case "vocabulary": {
        const vocabulary = await tx.vocabulary.create({ data: baseData });
        await tx.vocabularyEntry.create({
          data: {
            vocabularyId: vocabulary.id,
            word: "",
            meaning: "",
            sortOrder: 0,
            organizationId: user.organizationId,
            createdBy: user.id,
            updatedBy: user.id,
          },
        });
        break;
      }

      case "synonyms-antonyms": {
        const synonymsAntonyms = await tx.synonymsAntonyms.create({ data: baseData });
        await tx.synonymsAntonymsEntry.create({
          data: {
            synonymsAntonymsId: synonymsAntonyms.id,
            word: "",
            meanings: "",
            synonyms: "",
            antonyms: "",
            details: "",
            sortOrder: 0,
            organizationId: user.organizationId,
            createdBy: user.id,
            updatedBy: user.id,
          },
        });
        break;
      }

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

    return tx.contentBlock.delete({
      where: { id: blockId, contentId: ownedBlock.contentId },
    });
  });

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
    select: { kind: true },
  });

  if (!block || !["question-answer", "table-completion", "column-matching", "rearrange-sentence", "question-from-poems", "question-from-story"].includes(block.kind)) {
    throw new Error("Exercise block not found.");
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
    select: { id: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });

  if (!entries.some((entry) => entry.id === input.vocabularyEntryId)) {
    throw new Error("Vocabulary row not found.");
  }
  if (entries.length <= 1) {
    throw new Error("Vocabulary must keep at least one row.");
  }

  const deleted = await prisma.vocabularyEntry.delete({
    where: {
      id: input.vocabularyEntryId,
      vocabularyId: vocabulary.id,
      organizationId: user.organizationId,
    },
  });

  const remaining = entries.filter((entry) => entry.id !== input.vocabularyEntryId);
  await prisma.$transaction(
    remaining.map((entry, index) =>
      prisma.vocabularyEntry.update({
        where: { id: entry.id, vocabularyId: vocabulary.id, organizationId: user.organizationId },
        data: { sortOrder: index, updatedBy: user.id },
      }),
    ),
  );

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: "DELETE",
    entityName: "VocabularyEntry",
    entityId: deleted.id,
    changes: deleted,
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
  if (entries.length <= 1) {
    throw new Error("Synonyms / Antonyms must keep at least one row.");
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
  },
) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = updateThreeFieldBlockSchema.parse(input);
  const ownedBlock = await getOwnedContentBlock(parsed.blockId, user.organizationId);
  if (ownedBlock.contentId !== parsed.contentId || ownedBlock.kind !== options.expectedKind) {
    throw new Error(`${options.entityName} block does not belong to content.`);
  }

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



