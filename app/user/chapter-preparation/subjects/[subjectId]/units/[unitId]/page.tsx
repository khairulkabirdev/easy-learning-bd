import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, Home } from "lucide-react";

import { getPublishedSubjectDetail } from "@/app/user/lessons/data";
import { LessonTileGrid } from "@/components/app/LessonTileGrid";
import { buttonVariants } from "@/components/ui/button";
import { requireStudent } from "@/lib/app-auth";
import { cn } from "@/lib/utils";

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Home className="h-4 w-4" />
          <ChevronRight className="h-4 w-4" />
          <Link href="/user/chapter-preparation" className="font-medium text-foreground hover:text-primary">
            অধ্যায়ভিত্তিক প্রস্তুতি
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/user/chapter-preparation/subjects/${subjectId}`} className="font-medium text-foreground hover:text-primary">
            {detail.subject.name}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">{unit.title}</span>
        </div>
        <Link
          href={`/user/chapter-preparation/subjects/${subjectId}`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          অধ্যায় তালিকায় ফিরুন
        </Link>
      </div>
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
