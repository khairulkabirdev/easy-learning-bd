import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { EnglishSecondPaperKind } from "./types";

type BlockWhere = {
  id?: string;
  kind?: EnglishSecondPaperKind;
  classId?: string;
  subjectId?: string;
  organizationId: string;
};

export function englishSecondPaperStore(kind: EnglishSecondPaperKind) {
  const separate = kind === "parts-of-speech";
  return {
    maxSortOrder: async (args: { where: BlockWhere }) => {
      const query = { ...args, _max: { sortOrder: true } } as const;
      const result = separate
        ? await prisma.subjectPartsOfSpeechBlock.aggregate(query)
        : await prisma.subjectEnglishSecondPaperBlock.aggregate(query);
      return result._max.sortOrder;
    },
    create: (args: Pick<Prisma.SubjectEnglishSecondPaperBlockCreateArgs, "data">) =>
      separate ? prisma.subjectPartsOfSpeechBlock.create(args) : prisma.subjectEnglishSecondPaperBlock.create(args),
    findFirst: (args: { where: BlockWhere }) =>
      separate ? prisma.subjectPartsOfSpeechBlock.findFirst(args) : prisma.subjectEnglishSecondPaperBlock.findFirst(args),
    findMany: (args: { where: BlockWhere; orderBy: { sortOrder?: "asc" | "desc"; createdAt?: "asc" | "desc" }[] }) =>
      separate ? prisma.subjectPartsOfSpeechBlock.findMany(args) : prisma.subjectEnglishSecondPaperBlock.findMany(args),
    updateMany: (args: { where: BlockWhere; data: Prisma.SubjectEnglishSecondPaperBlockUpdateManyMutationInput }) =>
      separate ? prisma.subjectPartsOfSpeechBlock.updateMany(args) : prisma.subjectEnglishSecondPaperBlock.updateMany(args),
    delete: (args: { where: BlockWhere & { id: string } }) =>
      separate ? prisma.subjectPartsOfSpeechBlock.delete(args) : prisma.subjectEnglishSecondPaperBlock.delete(args),
  };
}
