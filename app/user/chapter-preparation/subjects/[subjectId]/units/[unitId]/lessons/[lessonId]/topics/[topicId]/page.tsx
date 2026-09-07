import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, Home } from "lucide-react";

import { getPublishedSubjectDetail } from "@/app/user/lessons/data";
import { TopicContentList } from "@/components/app/TopicContentList";
import { buttonVariants } from "@/components/ui/button";
import { requireStudent } from "@/lib/app-auth";
import { cn } from "@/lib/utils";

export default async function UserChapterPreparationTopicPage({
  params,
}: {
  params: Promise<{ subjectId: string; unitId: string; lessonId: string; topicId: string }>;
}) {
  const user = await requireStudent();
  const { subjectId, unitId, lessonId, topicId } = await params;

  if (!user.classId) {
    notFound();
  }

  const detail = await getPublishedSubjectDetail(user.organizationId, user.classId, subjectId);
  const unit = detail?.units.find((item) => item.id === unitId);
  const lesson = detail?.lessons.find((item) => item.id === lessonId && item.unitId === unitId);
  const topic = detail?.topics.find((item) => item.id === topicId && item.lessonId === lessonId);

  if (!detail || !unit || !lesson || !topic) {
    notFound();
  }

  const contents = detail.contents.filter((content) => content.topicId === topicId);

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
          <Link href={`/user/chapter-preparation/subjects/${subjectId}/units/${unitId}/lessons/${lessonId}`} className="font-medium text-foreground hover:text-primary">
            {lesson.title}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">{topic.title}</span>
        </div>
        <Link
          href={`/user/chapter-preparation/subjects/${subjectId}/units/${unitId}/lessons/${lessonId}`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          টপিক তালিকায় ফিরুন
        </Link>
      </div>

      <div className="space-y-1 pt-8">
        <h1 className="pb-3 text-xl font-semibold tracking-tight">কন্টেন্ট তালিকা</h1>
        <p className="text-sm text-muted-foreground">{topic.title}</p>
        <hr className="border-t" />
      </div>

      {contents.length > 0 ? (
        <TopicContentList contents={contents} />
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
          No content found for this topic.
        </div>
      )}
    </div>
  );
}