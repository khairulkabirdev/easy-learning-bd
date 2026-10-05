import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  FileQuestion,
  ListChecks,
  Quote,
  ScanText,
  Shuffle,
} from "lucide-react";

const TYPES = [
  {
    title: "Seen Composition",
    description: "Curriculum-based seen passages and exercises.",
    slug: "seen-composition",
    icon: BookOpenCheck,
  },
  {
    title: "Unseen Composition",
    description: "Create standalone unseen passages by title.",
    slug: "unseen-composition",
    icon: ScanText,
  },
  {
    title: "Matching Sentences",
    description: "Sentence matching practice section.",
    slug: "matching-sentences",
    icon: ListChecks,
  },
  {
    title: "Rearrange Sentence",
    description: "Rearrange and ordering practice section.",
    slug: "rearrange-sentence",
    icon: Shuffle,
  },
  {
    title: "Question from Poems",
    description: "Poem-based question practice.",
    slug: "question-from-poems",
    icon: Quote,
  },
  {
    title: "Question from Story",
    description: "Story-based question practice.",
    slug: "question-from-story",
    icon: FileQuestion,
  },
] as const;

export function EnglishFirstPaperTypeGrid({
  classId,
  subjectId,
}: {
  classId: string;
  subjectId: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {TYPES.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.slug}
            href={`/admin/content/class/${classId}/subject/${subjectId}/${item.slug}`}
            className="group flex min-h-32 flex-col justify-between rounded-2xl border border-border bg-background p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 dark:hover:border-primary/50 dark:hover:shadow-primary/20"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 text-primary dark:border-primary/30 dark:bg-primary/10">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{item.title}</div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end text-primary/70">
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
