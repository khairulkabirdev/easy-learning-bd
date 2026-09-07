import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, Home } from "lucide-react";

import { getPublishedContentById } from "@/app/user/lessons/data";
import type { ContentBlockRecord } from "@/app/admin/content/content-types";
import { McqChapterPager } from "@/components/app/McqChapterPager";
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
  const content = await getPublishedContentById(user.organizationId, contentId);
  const block = content?.blocks.find((item: ContentBlockRecord) => item.kind === "mcq" && item.mcqSection);

  if (!content || !block || !block.mcqSection) {
    notFound();
  }

  return (
    <div className="">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Home className="h-4 w-4" />
          <ChevronRight className="h-4 w-4" />
          <Link href="/user/chapter-preparation" className="font-medium text-foreground hover:text-primary">
            অধ্যায়ভিত্তিক প্রস্তুতি
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">MCQ</span>
        </div>
        <Link href={`/user/chapter-preparation/subjects/${content.subjectId}/units/${content.unitId}/lessons/${content.lessonId}`} className={cn(buttonVariants({ variant: "outline" }))}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          লেশনে ফিরুন
        </Link>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{block.mcqSection.title || "MCQ"}</h1>
        <hr className="border-t" />
      </div>

      <McqChapterPager
        content={content}
        blockId={block.id}
        title={block.mcqSection.title}
        description={block.mcqSection.description}
        questions={block.mcqSection.questions}
      />
    </div>
  );
}