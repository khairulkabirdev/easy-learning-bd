import { EnglishSecondPaperBlockListClient } from "@/components/admin/EnglishSecondPaperBlockListClient";
import { getAdminPagedRecords } from "@/lib/admin/paged-records";
import { getEnglishSecondPaperContext } from "./data";
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
  const result = await getAdminPagedRecords(user.organizationId, {
    resource: "english-second-paper",
    page: 1,
    pageSize: 10,
    filters: { kind, classId, subjectId },
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <EnglishSecondPaperBlockListClient
        kind={kind}
        classItem={subject.class}
        subject={{ id: subject.id, name: subject.name }}
        records={result.rows}
        total={result.total}
      />
    </div>
  );
}
