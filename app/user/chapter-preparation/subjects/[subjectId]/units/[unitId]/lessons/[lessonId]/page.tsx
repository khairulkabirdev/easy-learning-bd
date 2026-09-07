import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, Home } from "lucide-react";

import { getPublishedSubjectDetail } from "@/app/user/lessons/data";
import { TopicContentList } from "@/components/app/TopicContentList";
import { TopicTileGrid } from "@/components/app/TopicTileGrid";
import { buttonVariants } from "@/components/ui/button";
import { requireStudent } from "@/lib/app-auth";
import { cn } from "@/lib/utils";

export default async function UserChapterPreparationLessonPage({
  params,
}: {
  params: Promise<{ subjectId: string; unitId: string; lessonId: string }>;
}) {
  const user = await requireStudent();
  const { subjectId, unitId, lessonId } = await params;

  if (!user.classId) {
    notFound();
  }

  const detail = await getPublishedSubjectDetail(user.organizationId, user.classId, subjectId);
  const unit = detail?.units.find((item) => item.id === unitId);
  const lesson = detail?.lessons.find((item) => item.id === lessonId && item.unitId === unitId);

  if (!detail || !unit || !lesson) {
    notFound();
  }

  const topics = detail.topics.filter((topic) => topic.lessonId === lessonId);
  const lessonContents = detail.contents.filter((content) => content.lessonId === lessonId && !content.topicId);

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
          <Link href={`/user/chapter-preparation/subjects/${subjectId}/units/${unitId}`} className="font-medium text-foreground hover:text-primary">
            {unit.title}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">{lesson.title}</span>
        </div>
        <Link
          href={`/user/chapter-preparation/subjects/${subjectId}/units/${unitId}`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          লেশন তালিকায় ফিরুন
        </Link>
      </div>

      {lessonContents.length > 0 ? (
        <section className="space-y-4">
          <div className="space-y-1 pt-8">
            <h1 className="pb-3 text-xl font-semibold tracking-tight">লেশন কন্টেন্ট</h1>
            <hr className="border-t" />
          </div>
          <TopicContentList
            contents={lessonContents}
            viewerTitle="লেশন কন্টেন্ট দেখুন"
            viewerDescription="এই লেশনের কন্টেন্ট পড়ুন।"
          />
        </section>
      ) : topics.length > 0 ? (
        <section className="space-y-4">
          <div className="space-y-1 pt-8">
            <h1 className="pb-3 text-xl font-semibold tracking-tight">টপিক নির্বাচন করুন</h1>
            <hr className="border-t" />
          </div>
          <TopicTileGrid
            topics={topics}
            hrefBase={`/user/chapter-preparation/subjects/${subjectId}/units/${unitId}/lessons/${lessonId}/topics`}
          />
        </section>
      ) : (
        <div className="space-y-1 pt-8">
          <h1 className="pb-3 text-xl font-semibold tracking-tight">কন্টেন্ট বা টপিক পাওয়া যায়নি</h1>
          <hr className="border-t" />
          <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
            No content or topics found for this lesson.
          </div>
        </div>
      )}
    </div>
  );
}
