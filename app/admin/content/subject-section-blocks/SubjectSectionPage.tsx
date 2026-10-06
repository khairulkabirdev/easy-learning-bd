import { SubjectSectionBlockListClient } from "@/components/admin/SubjectSectionBlockListClient";
import { getSubjectSectionContext, listSubjectSectionRecords } from "./data";
import { type SubjectSectionKind } from "./types";

export async function SubjectSectionPage({
  kind,
  classId,
  subjectId,
}: {
  kind: SubjectSectionKind;
  classId: string;
  subjectId: string;
}) {
  const { user, subject } = await getSubjectSectionContext(classId, subjectId);
  const records = await listSubjectSectionRecords(kind, classId, subjectId, user.organizationId);
  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <SubjectSectionBlockListClient
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
