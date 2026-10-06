import { SubjectSectionPage } from "@/app/admin/content/subject-section-blocks/SubjectSectionPage";

export default async function Page({
  params,
}: {
  params: Promise<{ classId: string; subjectId: string }>;
}) {
  const { classId, subjectId } = await params;
  return <SubjectSectionPage kind="rearrange-sentence" classId={classId} subjectId={subjectId} />;
}
