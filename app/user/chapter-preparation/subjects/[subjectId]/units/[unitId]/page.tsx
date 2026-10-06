import { notFound } from "next/navigation";

import { getPublishedSubjectDetail } from "@/app/user/lessons/data";
import { LessonTileGrid } from "@/components/app/LessonTileGrid";
import { requireStudent } from "@/lib/app-auth";

export default async function UserChapterPreparationUnitPage({
  params,
}: {
  params: Promise<{ subjectId: string; unitId: string }>;
}) {
  const user = await requireStudent();
  const { subjectId, unitId } = await params;

  if (!user.classId) {
    notFound();
  }

  const detail = await getPublishedSubjectDetail(user.organizationId, user.classId, subjectId);
  const unit = detail?.units.find((item) => item.id === unitId);

  if (!detail || !unit) {
    notFound();
  }

  const lessons = detail.lessons.filter((lesson) => lesson.unitId === unitId);

  return (
    <div className="space-y-6">
      {lessons.length > 0 ? (
        <LessonTileGrid
          lessons={lessons}
          hrefBase={`/user/chapter-preparation/subjects/${subjectId}/units/${unitId}/lessons`}
        />
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
          No published lessons found for this unit.
        </div>
      )}
    </div>
  );
}
