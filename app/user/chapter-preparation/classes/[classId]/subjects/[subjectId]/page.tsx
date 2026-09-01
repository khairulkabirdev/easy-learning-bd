import { notFound } from "next/navigation";

import { getPublishedSubjectDetail } from "@/app/user/lessons/data";
import UserSubjectBrowser from "@/app/user/subjects/[subjectId]/UserSubjectBrowser";
import { requireUser } from "@/lib/app-auth";

export default async function UserClassSubjectPage({
  params,
}: {
  params: Promise<{ classId: string; subjectId: string }>;
}) {
  const user = await requireUser();
  const { classId, subjectId } = await params;
  const detail = await getPublishedSubjectDetail(user.organizationId, classId, subjectId);

  if (!detail) {
    notFound();
  }

  return (
    <UserSubjectBrowser
      subject={detail.subject}
      units={detail.units}
      lessons={detail.lessons}
      topics={detail.topics}
      contents={detail.contents}
      backHref={`/user/chapter-preparation/classes/${classId}`}
      backLabel="All subjects"
    />
  );
}
