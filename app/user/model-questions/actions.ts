"use server";

import { requireStudent } from "@/lib/app-auth";
import { getModelPaper, modelPaperEntryKey } from "@/lib/model-question-papers";

export async function finishModelPaper(subjectId: string, setId: string, entryKey: string) {
  const user = await requireStudent();
  if (!user.classId || typeof subjectId !== "string" || typeof setId !== "string" ||
      subjectId.length > 128 || setId.length > 128 || typeof entryKey !== "string" || !/^[a-f0-9]{64}$/.test(entryKey)) {
    return { error: "This paper is unavailable." };
  }
  const paper = await getModelPaper({ organizationId: user.organizationId, classId: user.classId, subjectId }, setId, "student");
  if (!paper) return { error: "This paper is no longer available. Your answers are still on this page." };
  if (entryKey !== modelPaperEntryKey(paper)) return { error: "The paper changed during this attempt. Reload to start the updated version." };
  return { paper };
}
