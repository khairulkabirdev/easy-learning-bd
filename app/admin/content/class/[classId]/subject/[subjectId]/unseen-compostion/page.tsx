import { redirect } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ classId: string; subjectId: string }>;
}) {
  const { classId, subjectId } = await params;
  redirect(`/admin/content/class/${classId}/subject/${subjectId}/unseen-composition`);
}
