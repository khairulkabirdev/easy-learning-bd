import { notFound } from "next/navigation";

import { isEnglishFirstPaperSubject } from "@/app/admin/content/navigation-helpers";
import { getPublishedSubjectMeta } from "@/app/user/chapter-preparation/first-paper-data";
import { getPublishedSubjectDetail } from "@/app/user/lessons/data";
import { EnglishFirstPaperTypeGrid } from "@/components/app/EnglishFirstPaperTypeGrid";
import { UnitTileGrid } from "@/components/app/UnitsTileGrid";
import { requireStudent } from "@/lib/app-auth";

export default async function UserChapterPreparationSubjectPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const user = await requireStudent();
  const { subjectId } = await params;

  if (!user.classId) notFound();

  const subject = await getPublishedSubjectMeta(user.organizationId, user.classId, subjectId);
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

  const detail = await getPublishedSubjectDetail(user.organizationId, user.classId, subjectId);
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-1 pt-8">
        <h1 className="pb-3 text-xl font-semibold tracking-tight">অধ্যায় নির্বাচন করুন</h1>
        <hr className="border-t" />
      </div>

      {detail.units.length > 0 ? (
        <UnitTileGrid
          units={detail.units}
          hrefBase={`/user/chapter-preparation/subjects/${subjectId}/units`}
        />
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
          No published units found for this subject.
        </div>
      )}
    </div>
  );
}
