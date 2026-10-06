import { SubjectSectionEditorPage } from "@/app/admin/content/subject-section-blocks/SubjectSectionEditorPage";

export default async function Page({
  params,
}: {
  params: Promise<{ classId: string; subjectId: string; blockId: string }>;
}) {
  const { classId, subjectId, blockId } = await params;
  return (
    <SubjectSectionEditorPage
      kind="rearrange-sentence"
      classId={classId}
      subjectId={subjectId}
      blockId={blockId}
    />
  );
}
