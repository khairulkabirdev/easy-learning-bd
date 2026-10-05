import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, Home, Layers3 } from "lucide-react";

import type {
  ContentBlockKind,
  ContentBlockRecord,
} from "@/app/admin/content/content-types";
import { getPublishedContentByBlockKind } from "@/app/user/lessons/data";
import type { StudentContentRecord } from "@/app/user/lessons/student-content";
import { FirstPaperChapterSetCard } from "@/components/app/FirstPaperChapterSetCard";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireStudent } from "@/lib/app-auth";
import { cn } from "@/lib/utils";

export async function FirstPaperBlockChapterPage({
  contentId,
  kind,
  title,
}: {
  contentId: string;
  kind: ContentBlockKind;
  title: string;
}) {
  const user = await requireStudent();

  if (!user.classId) {
    notFound();
  }

  const content = await getPublishedContentByBlockKind(
    user.organizationId,
    user.classId,
    contentId,
    kind,
  );

  if (!content) {
    notFound();
  }

  const matchingBlocks = content.blocks.filter(
    (block: ContentBlockRecord) => block.kind === kind,
  );

  if (matchingBlocks.length === 0) {
    notFound();
  }

  const hasMultipleBlocks = matchingBlocks.length > 1;

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
          <span className="font-medium text-foreground">{title}</span>
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
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {hasMultipleBlocks ? (
            <Badge variant="outline" className="gap-1.5 font-normal">
              <Layers3 className="h-3.5 w-3.5" />
              {matchingBlocks.length} blocks
            </Badge>
          ) : null}
        </div>
        <hr className="border-t" />
      </div>

      <div className="mt-5 space-y-6">
        {matchingBlocks.map((block: ContentBlockRecord, index: number) => {
          const blockContent: StudentContentRecord = {
            ...content,
            blocks: [block],
          };

          return (
            <FirstPaperChapterSetCard
              key={block.id}
              content={blockContent}
              title={title}
              setNumber={index + 1}
            />
          );
        })}
      </div>
    </div>
  );
}
