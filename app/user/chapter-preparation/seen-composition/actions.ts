"use server";

import { isEnglishFirstPaperSubject } from "@/app/admin/content/navigation-helpers";
import {
  getPublishedSubjectMeta,
  getSeenCompositionPage,
  seenPassageKindFromParam,
} from "@/app/user/chapter-preparation/first-paper-data";
import { requireStudent } from "@/lib/app-auth";

export type LoadSeenCompositionPageInput = {
  subjectId: string;
  unitId: string;
  lessonId: string;
  passage: "1" | "2";
  query?: string;
  page: number;
  pageSize?: number;
};

export async function loadSeenCompositionPageAction(input: LoadSeenCompositionPageInput) {
  const user = await requireStudent();
  if (!user.classId) throw new Error("Student class is not configured.");

  const passageKind = seenPassageKindFromParam(input.passage);
  if (!passageKind) throw new Error("Invalid passage type.");

  const subject = await getPublishedSubjectMeta(user.organizationId, user.classId, input.subjectId);
  if (!subject || !isEnglishFirstPaperSubject(subject)) {
    throw new Error("English 1st Paper subject was not found.");
  }

  return getSeenCompositionPage({
    organizationId: user.organizationId,
    classId: user.classId,
    subjectId: input.subjectId,
    unitId: input.unitId,
    lessonId: input.lessonId,
    passageKind,
    query: input.query?.trim() || "",
    page: Math.max(1, input.page),
    pageSize: Math.min(Math.max(input.pageSize ?? 10, 1), 30),
  });
}
