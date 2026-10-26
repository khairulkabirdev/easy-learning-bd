import { notFound } from "next/navigation";

import { isEnglishFirstPaperSubject } from "@/app/admin/content/navigation-helpers";
import { getPublishedSubjectMeta } from "@/app/user/chapter-preparation/first-paper-data";
import { getPublishedSubjectDetail } from "@/app/user/lessons/data";
import UserSubjectBrowser from "@/app/user/subjects/[subjectId]/UserSubjectBrowser";
import { EnglishFirstPaperTypeGrid } from "@/components/app/EnglishFirstPaperTypeGrid";
import { requireUser } from "@/lib/app-auth";

export default async function UserClassSubjectPage({
  params,
}: {
  params: Promise<{ classId: string; subjectId: string }>;
}) {
  const user = await requireUser();
  const { classId, subjectId } = await params;

  const subject = await getPublishedSubjectMeta(user.organizationId, classId, subjectId);
  if (!subject) notFound();

  if (isEnglishFirstPaperSubject(subject)) {
    return (
      <div className="space-y-6 pt-2 sm:pt-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{subject.name}</h1>
          <p className="text-sm text-muted-foreground">Choose the English 1st Paper content type.</p>
        </div>

        <EnglishFirstPaperTypeGrid
          subjectId={subjectId}
          hrefBase={`/user/chapter-preparation/subjects/${subjectId}`}
        />
      </div>
    );
  }

  const detail = await getPublishedSubjectDetail(user.organizationId, classId, subjectId);
  if (!detail) notFound();

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
