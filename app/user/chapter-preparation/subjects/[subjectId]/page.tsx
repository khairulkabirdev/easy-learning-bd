import { notFound } from "next/navigation";

import { getPublishedSubjectDetail } from "@/app/user/lessons/data";
import { UnitTileGrid } from "@/components/app/UnitsTileGrid";
import { requireStudent } from "@/lib/app-auth";

export default async function UserChapterPreparationSubjectPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const user = await requireStudent();
  const { subjectId } = await params;

  if (!user.classId) {
    notFound();
  }

  const detail = await getPublishedSubjectDetail(user.organizationId, user.classId, subjectId);

  if (!detail) {
    notFound();
  }

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
