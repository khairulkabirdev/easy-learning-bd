"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin, assertTrustedMutationOrigin } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";

const contentBlockKindSchema = z.enum([
  "paragraph",
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
  "sentence-ordering",
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

const reorderBlocksSchema = z.array(
  z.object({
    id: z.string(),
    sortOrder: z.number().int(),
  }),
);

const updateParagraphSchema = z.object({
  contentId: z.string(),
  blockId: z.string(),
  paragraphId: z.string(),
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

const updateInformationTransferSchema = updateThreeFieldBlockSchema.extend({
  documentJson: z.string(),
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
  documentJson: z.string(),
});

const passageLinkSchema = z.object({
  passage: z.string(),
  passageSource: z.enum(["manual", "paragraph"]),
  paragraphBlockId: z.string().nullable(),
});

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
  documentJson: z.string(),
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
  documentJson: z.string(),
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
    },
  });

  if (!block) {
    throw new Error("Content block not found.");
  }

  return block;
}

async function assertHierarchyPath(input: z.infer<typeof contentSchema>) {
  const subject = await prisma.subject.findFirst({
    where: {
      id: input.subjectId,
      classId: input.classId,
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
      },
      select: { id: true },
    });

    if (!topic) {
      throw new Error("Topic does not belong to lesson.");
    }
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

  await assertHierarchyPath(parsed);
  await assertUniqueContentPath({ ...parsed, organizationId: user.organizationId });

  if (parsed.id) {
    const updated = await prisma.content.update({
      where: { id: parsed.id },
      data: {
        classId: parsed.classId,
        subjectId: parsed.subjectId,
        unitId: parsed.unitId,
        lessonId: parsed.lessonId,
        topicId: parsed.topicId || null,
        updatedBy: user.id,
      },
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
    where: { id },
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
  const blockCount = await prisma.contentBlock.count({
    where: { contentId: parsed.contentId },
  });

  const block = await prisma.$transaction(async (tx) => {
    const createdBlock = await tx.contentBlock.create({
      data: {
        contentId: parsed.contentId,
        kind: parsed.kind,
        sortOrder: blockCount,
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
            title: "",
            instruction: "",
            question: "",
            answer: "",
            details: "",
            documentJson: JSON.stringify(createQuestionAnswerDocument()),
          },
        });
        break;

      case "sentence-ordering":
        await tx.sentenceOrderingExercise.create({
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

  const deleted = await prisma.contentBlock.delete({
    where: { id: blockId },
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

  if (ownedBlock.contentId !== parsed.contentId) {
    throw new Error("Content block does not belong to content.");
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

  if (!block || !["question-answer", "table-completion", "column-matching", "sentence-ordering"].includes(block.kind)) {
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
    case "sentence-ordering":
      updated = await prisma.sentenceOrderingExercise.update({
        where: {
          id: parsed.questionAnswerExerciseId,
          contentBlockId: parsed.blockId,
          organizationId: user.organizationId,
        },
        data,
      });
      entityName = "SentenceOrderingExercise";
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

  const updated = await prisma.trueFalseExercise.update({
    where: { id: parsed.trueFalseExerciseId },
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

  const updated = await prisma.mcqSection.update({
    where: { id: parsed.mcqSectionId },
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

  const updated = await prisma.informationTransfer.update({
    where: {
      id: parsed.recordId,
      contentBlockId: parsed.blockId,
      organizationId: user.organizationId,
    },
    data: {
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
  if (ownedBlock.contentId !== parsed.contentId) {
    throw new Error("Vocabulary block does not belong to content.");
  }

  const updated = await prisma.vocabulary.update({
    where: { id: parsed.vocabularyId },
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
  if (ownedBlock.contentId !== parsed.contentId) {
    throw new Error("Vocabulary block does not belong to content.");
  }

  const vocabulary = await prisma.vocabulary.findFirst({
    where: {
      id: parsed.vocabularyId,
      contentBlockId: parsed.blockId,
      organizationId: user.organizationId,
    },
    select: { id: true },
  });

  if (!vocabulary) {
    throw new Error("Vocabulary block not found.");
  }

  const sortOrder = await prisma.vocabularyEntry.count({
    where: { vocabularyId: parsed.vocabularyId },
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
  if (ownedBlock.contentId !== parsed.contentId) {
    throw new Error("Vocabulary block does not belong to content.");
  }

  const updated = await prisma.vocabularyEntry.update({
    where: { id: parsed.vocabularyEntryId },
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
  if (ownedBlock.contentId !== input.contentId) {
    throw new Error("Vocabulary block does not belong to content.");
  }

  const entries = await prisma.vocabularyEntry.findMany({
    where: { vocabularyId: input.vocabularyId },
    select: { id: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });

  if (entries.length <= 1) {
    throw new Error("Vocabulary must keep at least one row.");
  }

  const deleted = await prisma.vocabularyEntry.delete({
    where: { id: input.vocabularyEntryId },
  });

  const remaining = entries.filter((entry) => entry.id !== input.vocabularyEntryId);
  await prisma.$transaction(
    remaining.map((entry, index) =>
      prisma.vocabularyEntry.update({
        where: { id: entry.id },
        data: { sortOrder: index },
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
  if (ownedBlock.contentId !== parsed.contentId) {
    throw new Error("Synonyms / Antonyms block does not belong to content.");
  }

  const updated = await prisma.synonymsAntonyms.update({
    where: { id: parsed.synonymsAntonymsId },
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
  if (ownedBlock.contentId !== parsed.contentId) {
    throw new Error("Synonyms / Antonyms block does not belong to content.");
  }

  const synonymsAntonyms = await prisma.synonymsAntonyms.findFirst({
    where: {
      id: parsed.synonymsAntonymsId,
      organizationId: user.organizationId,
    },
    select: { id: true },
  });

  if (!synonymsAntonyms) {
    throw new Error("Synonyms / Antonyms block not found.");
  }

  const sortOrder = await prisma.synonymsAntonymsEntry.count({
    where: { synonymsAntonymsId: parsed.synonymsAntonymsId },
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
  if (ownedBlock.contentId !== parsed.contentId) {
    throw new Error("Synonyms / Antonyms block does not belong to content.");
  }

  const updated = await prisma.synonymsAntonymsEntry.update({
    where: { id: parsed.synonymsAntonymsEntryId },
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
  if (ownedBlock.contentId !== input.contentId) {
    throw new Error("Synonyms / Antonyms block does not belong to content.");
  }

  const entries = await prisma.synonymsAntonymsEntry.findMany({
    where: { synonymsAntonymsId: input.synonymsAntonymsId },
    select: { id: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });

  if (entries.length <= 1) {
    throw new Error("Synonyms / Antonyms must keep at least one row.");
  }

  const deleted = await prisma.synonymsAntonymsEntry.delete({
    where: { id: input.synonymsAntonymsEntryId },
  });

  const remaining = entries.filter((entry) => entry.id !== input.synonymsAntonymsEntryId);
  await prisma.$transaction(
    remaining.map((entry, index) =>
      prisma.synonymsAntonymsEntry.update({
        where: { id: entry.id },
        data: { sortOrder: index },
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
    update: (parsed: z.infer<typeof updateThreeFieldBlockSchema>, userId: string) => Promise<unknown>;
  },
) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = updateThreeFieldBlockSchema.parse(input);

  const updated = await options.update(parsed, user.id);

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
    update: (parsed: z.infer<typeof updatePassageThreeFieldBlockSchema>, userId: string) => Promise<unknown>;
  },
) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = updatePassageThreeFieldBlockSchema.parse(input);
  const updated = await options.update(parsed, user.id);

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
    update: (parsed, userId) =>
      prisma.gapFillExercise.update({
        where: { id: parsed.recordId },
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
    update: (parsed, userId) =>
      prisma.gapFillFirstPaper.update({
        where: { id: parsed.recordId },
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
    update: (parsed, userId) =>
      prisma.gapFillSecondPaper.update({
        where: { id: parsed.recordId },
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
    update: (parsed, userId) =>
      prisma.substitutionTable.update({
        where: { id: parsed.recordId },
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
    update: (parsed, userId) =>
      prisma.rightFormOfVerb.update({
        where: { id: parsed.recordId },
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
    update: (parsed, userId) =>
      prisma.narration.update({
        where: { id: parsed.recordId },
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
    update: (parsed, userId) =>
      prisma.changingSentence.update({
        where: { id: parsed.recordId },
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
    update: (parsed, userId) =>
      prisma.punctuationAndCapitalization.update({
        where: { id: parsed.recordId },
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
    update: (parsed, userId) =>
      prisma.preposition.update({
        where: { id: parsed.recordId },
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
    update: (parsed, userId) =>
      prisma.suffixAndPrefix.update({
        where: { id: parsed.recordId },
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
    update: (parsed, userId) =>
      prisma.tagQuestion.update({
        where: { id: parsed.recordId },
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
    update: (parsed, userId) =>
      prisma.connector.update({
        where: { id: parsed.recordId },
        data: {
          question: parsed.question,
          answer: parsed.answer,
          details: parsed.details,
          updatedBy: userId,
        },
      }),
  });
}



