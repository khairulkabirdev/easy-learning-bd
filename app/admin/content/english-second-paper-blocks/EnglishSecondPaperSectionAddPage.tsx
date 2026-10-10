import { EnglishSecondPaperBlockEditorClient } from "@/components/admin/EnglishSecondPaperBlockEditorClient";
import { getEnglishSecondPaperContext } from "./data";
import { makeEmptyEnglishSecondPaperRecord, type EnglishSecondPaperKind } from "./types";

export async function EnglishSecondPaperSectionAddPage({
  kind,
  classId,
  subjectId,
}: {
  kind: EnglishSecondPaperKind;
  classId: string;
  subjectId: string;
}) {
  const { subject } = await getEnglishSecondPaperContext(classId, subjectId);
  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <EnglishSecondPaperBlockEditorClient
        kind={kind}
        classItem={subject.class}
        subject={{ id: subject.id, name: subject.name }}
        record={makeEmptyEnglishSecondPaperRecord(kind, classId, subjectId)}
        mode="create"
      />
    </div>
  );
}
