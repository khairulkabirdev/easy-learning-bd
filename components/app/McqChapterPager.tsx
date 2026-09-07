"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";

import { StudentContentViewer, type StudentContentRecord } from "@/app/user/lessons/student-content";
import type { McqQuestionRecord } from "@/app/admin/content/content-types";
import { Button } from "@/components/ui/button";

const QUESTIONS_PER_PAGE = 10;

export function McqChapterPager({
  content,
  blockId,
  title,
  description,
  questions,
}: {
  content: StudentContentRecord;
  blockId: string;
  title: string;
  description: string;
  questions: McqQuestionRecord[];
}) {
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const pageCount = Math.ceil(questions.length / QUESTIONS_PER_PAGE);
  const start = page * QUESTIONS_PER_PAGE;
  const visibleQuestions = questions.slice(start, start + QUESTIONS_PER_PAGE);
  const block = content.blocks.find((item) => item.id === blockId);

  useEffect(() => {
    if (!isLoading) return;

    const timer = window.setTimeout(() => setIsLoading(false), 450);
    return () => window.clearTimeout(timer);
  }, [isLoading]);

  if (!block || isLoading) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-2xl border bg-background p-8">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
          প্রশ্ন লোড হচ্ছে...
        </div>
      </div>
    );
  }

  const pagedBlock = {
    ...block,
    mcqSection: block.mcqSection
      ? { ...block.mcqSection, title, description, questions: visibleQuestions }
      : null,
  };
  const pagedContent = { ...content, blocks: [pagedBlock] };

  function goToPage(nextPage: number) {
    setIsLoading(true);
    setPage(nextPage);
  }

  return (
    <div className="max-w-3xl mx-auto pb-6 min-h-screen px-2 mt-5">

      <StudentContentViewer content={pagedContent} title={title || "MCQ"} description={description} showHeader={false} />

      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <Button type="button" variant="outline" disabled={page === 0 || isLoading} onClick={() => goToPage(page - 1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            আগের ১০টি
          </Button>
          <Button type="button" disabled={page === pageCount - 1 || isLoading} onClick={() => goToPage(page + 1)}>
            পরের ১০টি
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}