import { SubjectSectionAddPage } from "@/app/admin/content/subject-section-blocks/SubjectSectionAddPage";

export default async function Page({
  params,
}: {
  params: Promise<{ classId: string; subjectId: string }>;
}) {
  const { classId, subjectId } = await params;
  return <SubjectSectionAddPage kind="matching-sentences" classId={classId} subjectId={subjectId} />;
}
