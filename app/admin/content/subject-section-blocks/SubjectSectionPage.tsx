import { SubjectSectionBlockListClient } from "@/components/admin/SubjectSectionBlockListClient";
import { getAdminPagedRecords } from "@/lib/admin/paged-records";
import { getSubjectSectionContext } from "./data";
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
  const result = await getAdminPagedRecords(user.organizationId, {
    resource: "subject-section",
    page: 1,
    pageSize: 10,
    filters: { kind, classId, subjectId },
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <SubjectSectionBlockListClient
        kind={kind}
        classItem={subject.class}
        subject={{ id: subject.id, name: subject.name }}
        records={result.rows}
        total={result.total}
      />
    </div>
  );
}
