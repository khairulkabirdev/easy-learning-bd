import { notFound } from "next/navigation";

import { EnglishSecondPaperBlockEditorClient } from "@/components/admin/EnglishSecondPaperBlockEditorClient";
import { getEnglishSecondPaperContext, getEnglishSecondPaperRecord } from "./data";
import type { EnglishSecondPaperKind } from "./types";

export async function EnglishSecondPaperSectionEditorPage({
  kind,
  classId,
  subjectId,
  blockId,
}: {
  kind: EnglishSecondPaperKind;
  classId: string;
  subjectId: string;
  blockId: string;
}) {
  const { user, subject } = await getEnglishSecondPaperContext(classId, subjectId);
  const record = await getEnglishSecondPaperRecord(kind, blockId, classId, subjectId, user.organizationId);
  if (!record) notFound();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <EnglishSecondPaperBlockEditorClient
        kind={kind}
        classItem={subject.class}
        subject={{ id: subject.id, name: subject.name }}
        record={record}
      />
    </div>
  );
}
