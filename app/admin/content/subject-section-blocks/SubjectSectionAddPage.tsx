import { SubjectSectionBlockEditorClient } from "@/components/admin/SubjectSectionBlockEditorClient";
import { getSubjectSectionContext } from "./data";
import {
  createDefaultDocumentForKind,
  type SubjectSectionKind,
  type SubjectSectionRecord,
} from "./types";

export async function SubjectSectionAddPage({
  kind,
  classId,
  subjectId,
}: {
  kind: SubjectSectionKind;
  classId: string;
  subjectId: string;
}) {
  const { subject } = await getSubjectSectionContext(classId, subjectId);
  const draftRecord: SubjectSectionRecord = {
    id: "new",
    classId,
    subjectId,
    title: "",
    instruction: "",
    details: "",
    documentJson: JSON.stringify(createDefaultDocumentForKind(kind)),
    sortOrder: 0,
    updatedAt: "",
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <SubjectSectionBlockEditorClient
        kind={kind}
        classItem={subject.class}
        subject={{ id: subject.id, name: subject.name }}
        record={draftRecord}
        mode="create"
      />
    </div>
  );
}
