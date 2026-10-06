import { notFound } from "next/navigation";

import { SubjectSectionBlockEditorClient } from "@/components/admin/SubjectSectionBlockEditorClient";
import { getSubjectSectionContext, getSubjectSectionRecord } from "./data";
import { type SubjectSectionKind } from "./types";

export async function SubjectSectionEditorPage({
  kind,
  classId,
  subjectId,
  blockId,
}: {
  kind: SubjectSectionKind;
  classId: string;
  subjectId: string;
  blockId: string;
}) {
  const { user, subject } = await getSubjectSectionContext(classId, subjectId);
  const record = await getSubjectSectionRecord(kind, blockId, classId, subjectId, user.organizationId);
  if (!record) notFound();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <SubjectSectionBlockEditorClient
        kind={kind}
        classItem={subject.class}
        subject={{ id: subject.id, name: subject.name }}
        record={record}
      />
    </div>
  );
}
