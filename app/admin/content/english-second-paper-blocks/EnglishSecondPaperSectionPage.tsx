import { EnglishSecondPaperBlockListClient } from "@/components/admin/EnglishSecondPaperBlockListClient";
import { getEnglishSecondPaperContext, listEnglishSecondPaperRecords } from "./data";
import type { EnglishSecondPaperKind } from "./types";

export async function EnglishSecondPaperSectionPage({
  kind,
  classId,
  subjectId,
}: {
  kind: EnglishSecondPaperKind;
  classId: string;
  subjectId: string;
}) {
  const { user, subject } = await getEnglishSecondPaperContext(classId, subjectId);
  const records = await listEnglishSecondPaperRecords(kind, classId, subjectId, user.organizationId);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <EnglishSecondPaperBlockListClient
        kind={kind}
        classItem={subject.class}
        subject={{ id: subject.id, name: subject.name }}
        records={records.map((item) => ({
          id: item.id,
          title: item.title,
          sortOrder: item.sortOrder,
          updatedAt: item.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
