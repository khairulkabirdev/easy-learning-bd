import { notFound } from "next/navigation";

import { getPublishedSubjectDetail } from "@/app/user/lessons/data";
import { TopicContentList } from "@/components/app/TopicContentList";
import { TopicTileGrid } from "@/components/app/TopicTileGrid";
import { requireStudent } from "@/lib/app-auth";

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
