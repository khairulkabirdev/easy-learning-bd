import { notFound } from "next/navigation";

import { getPublishedSubjectDetail } from "@/app/user/lessons/data";
import { TopicContentList } from "@/components/app/TopicContentList";
import { requireStudent } from "@/lib/app-auth";

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