import { notFound } from "next/navigation";
import { Layers3 } from "lucide-react";

import { getPublishedQuestionAnswerContentById } from "@/app/user/lessons/data";
import type {
  ContentBlockRecord,
  QuestionAnswerRowRecord,
} from "@/app/admin/content/content-types";
import { QuestionAnswerChapterPager } from "@/components/app/QuestionAnswerChapterPager";
import { Badge } from "@/components/ui/badge";
import { requireStudent } from "@/lib/app-auth";
import { cn } from "@/lib/utils";


type QuestionAnswerSection = {
  blockId: string;
  title: string;
  passage: string;
  rows: QuestionAnswerRowRecord[];
};

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

  if (!content) {
    notFound();
  }

  const questionAnswerBlocks = content.blocks.filter(
    (item: ContentBlockRecord) =>
      item.kind === "question-answer" && Boolean(item.questionAnswerExercise),
  );

  if (questionAnswerBlocks.length === 0) {
    notFound();
  }

  const sections: QuestionAnswerSection[] = questionAnswerBlocks.flatMap<QuestionAnswerSection>(
    (block: ContentBlockRecord) => {
    const exercise = block.questionAnswerExercise;
    if (!exercise) return [];

    const linkedParagraph =
      exercise.passageSource === "paragraph" && exercise.paragraphBlockId
        ? content.blocks.find(
            (item: ContentBlockRecord) => item.id === exercise.paragraphBlockId,
          )?.paragraph
        : null;

    const passage =
      exercise.passageSource === "paragraph"
        ? linkedParagraph?.body || ""
        : exercise.details || exercise.instruction || "";

      return [
        {
          blockId: block.id,
          title: exercise.title || "Question Answer",
          passage,
          rows: exercise.rows,
        },
      ];
    },
  );

  const hasMultipleBlocks = sections.length > 1;

  return (
    <div>
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Question Answer</h1>
          {hasMultipleBlocks ? (
            <Badge variant="outline" className="gap-1.5 font-normal">
              <Layers3 className="h-3.5 w-3.5" />
              {sections.length} blocks
            </Badge>
          ) : null}
        </div>
        <hr className="border-t" />
      </div>

      <div className={cn("space-y-6", hasMultipleBlocks && "mt-5")}>
        {sections.map((section: QuestionAnswerSection, index: number) => (
          <section key={section.blockId} className="space-y-2">
            {hasMultipleBlocks ? (
              <div className="mx-auto flex max-w-3xl items-center gap-2 px-2">
                <Badge className="rounded-full" variant="secondary">
                  Set {String(index + 1).padStart(2, "0")}
                </Badge>
                <h2 className="min-w-0 truncate text-sm font-semibold text-foreground">
                  {section.title}
                </h2>
              </div>
            ) : null}

            <QuestionAnswerChapterPager
              title={section.title}
              passage={section.passage}
              rows={section.rows}
              compact={hasMultipleBlocks}
            />
          </section>
        ))}
      </div>
    </div>
  );
}
