import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, Home, Layers3 } from "lucide-react";

import { getPublishedContentById } from "@/app/user/lessons/data";
import type { ContentBlockRecord } from "@/app/admin/content/content-types";
import { McqChapterPager } from "@/components/app/McqChapterPager";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireStudent } from "@/lib/app-auth";
import { cn } from "@/lib/utils";

export default async function UserMcqChapterPage({
  params,
}: {
  params: Promise<{ contentId: string }>;
}) {
  const user = await requireStudent();
  const { contentId } = await params;

  if (!user.classId) {
    notFound();
  }

  const content = await getPublishedContentById(
    user.organizationId,
    user.classId,
    contentId,
  );

  if (!content) {
    notFound();
  }

  const mcqBlocks = content.blocks.filter(
    (item: ContentBlockRecord) => item.kind === "mcq" && Boolean(item.mcqSection),
  );

  if (mcqBlocks.length === 0) {
    notFound();
  }

  const hasMultipleBlocks = mcqBlocks.length > 1;

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
          <span className="font-medium text-foreground">MCQ</span>
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
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">MCQ</h1>
          {hasMultipleBlocks ? (
            <Badge variant="outline" className="gap-1.5 font-normal">
              <Layers3 className="h-3.5 w-3.5" />
              {mcqBlocks.length} blocks
            </Badge>
          ) : null}
        </div>
        <hr className="border-t" />
      </div>

      <div className={cn("space-y-6", hasMultipleBlocks && "mt-5")}>
        {mcqBlocks.map((block: ContentBlockRecord, index: number) => {
          const section = block.mcqSection;
          if (!section) return null;

          return (
            <section key={block.id} className="space-y-2">
              {hasMultipleBlocks ? (
                <div className="mx-auto flex max-w-3xl items-center gap-2 px-2">
                  <Badge className="rounded-full" variant="secondary">
                    Set {String(index + 1).padStart(2, "0")}
                  </Badge>
                  <h2 className="min-w-0 truncate text-sm font-semibold text-foreground">
                    {section.title || `MCQ ${index + 1}`}
                  </h2>
                </div>
              ) : null}

              <McqChapterPager
                content={content}
                blockId={block.id}
                title={section.title || "MCQ"}
                description={section.description}
                questions={section.questions}
                compact={hasMultipleBlocks}
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}
