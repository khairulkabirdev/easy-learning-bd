import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, Home } from "lucide-react";

import { getPublishedQuestionAnswerContentById } from "@/app/user/lessons/data";
import type { ContentBlockRecord } from "@/app/admin/content/content-types";
import { QuestionAnswerChapterPager } from "@/components/app/QuestionAnswerChapterPager";
import { buttonVariants } from "@/components/ui/button";
import { requireStudent } from "@/lib/app-auth";
import { cn } from "@/lib/utils";

export default async function UserQuestionAnswerChapterPage({
  params,
}: {
  params: Promise<{ contentId: string }>;
}) {
  const user = await requireStudent();
  const { contentId } = await params;

  if (!user.classId) {
    notFound();
  }

  const content = await getPublishedQuestionAnswerContentById(
    user.organizationId,
    user.classId,
    contentId,
  );
  const block = content?.blocks.find(
    (item: ContentBlockRecord) => item.kind === "question-answer" && item.questionAnswerExercise,
  );

  if (!content || !block || !block.questionAnswerExercise) {
    notFound();
  }

  const exercise = block.questionAnswerExercise;
  const linkedParagraph =
    exercise.passageSource === "paragraph" && exercise.paragraphBlockId
      ? content.blocks.find((item: ContentBlockRecord) => item.id === exercise.paragraphBlockId)?.paragraph
      : null;
  const passage =
    exercise.passageSource === "paragraph"
      ? linkedParagraph?.body || ""
      : exercise.details || exercise.instruction || "";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Home className="h-4 w-4" />
          <ChevronRight className="h-4 w-4" />
          <Link
            href="/user/chapter-preparation"
            className="font-medium text-foreground hover:text-primary"
          >
            অধ্যায়ভিত্তিক প্রস্তুতি
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">Question Answer</span>
        </div>

        <Link
          href={`/user/chapter-preparation/subjects/${content.subjectId}/units/${content.unitId}/lessons/${content.lessonId}`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          লেশনে ফিরুন
        </Link>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {exercise.title || "Question Answer"}
        </h1>
        <hr className="border-t" />
      </div>

      <QuestionAnswerChapterPager
        title={exercise.title || "Question Answer"}
        passage={passage}
        rows={exercise.rows}
      />
    </div>
  );
}
