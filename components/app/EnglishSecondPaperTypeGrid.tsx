import { secondPaperSectionAssignmentKind, type BlockAssignmentKind } from "@/app/admin/content/content-types";
import Link from "next/link";
import {
  ArrowRight,
  Braces,
  CaseUpper,
  FilePenLine,
  FileQuestion,
  Link2,
  ListRestart,
  MessageSquareQuote,
  Rows3,
  SpellCheck2,
  TextCursorInput,
} from "lucide-react";

const TYPES = [
  {
    title: "Gap Filling",
    description: "Create inline blanks with matching answers.",
    slug: "gap-filling",
    icon: TextCursorInput,
  },
  {
    title: "Substitution Table",
    description: "Build sentence-part columns and valid combinations.",
    slug: "substitution-table",
    icon: Rows3,
  },
  {
    title: "Right Form of Verb",
    description: "Create verb blanks with matching answers.",
    slug: "right-form-of-verb",
    icon: SpellCheck2,
  },
  {
    title: "Narration",
    description: "Create narration questions and answers.",
    slug: "narration",
    icon: MessageSquareQuote,
  },
  {
    title: "Changing Sentence",
    description: "Add sentence transformations as separate items.",
    slug: "changing-sentence",
    icon: ListRestart,
  },
  {
    title: "Punctuation and Capitalization",
    description: "Create punctuation and capitalization practice.",
    slug: "punctuation-and-capitalization",
    icon: CaseUpper,
  },
  {
    title: "Preposition",
    description: "Create preposition blanks with answers.",
    slug: "preposition",
    icon: FilePenLine,
  },
  {
    title: "Suffix and Prefix",
    description: "Mark root words and save completed-word answers.",
    slug: "suffix-and-prefix",
    icon: Braces,
  },
  {
    title: "Parts of Speech",
    description: "Mark words in context and save their parts of speech.",
    slug: "parts-of-speech",
    icon: SpellCheck2,
  },
  {
    title: "Tag Question",
    description: "Create per-item or paragraph-based tag questions.",
    slug: "tag-question",
    icon: FileQuestion,
  },
  {
    title: "Connector",
    description: "Create connector blanks with matching answers.",
    slug: "connector",
    icon: Link2,
  },
] as const;

export function EnglishSecondPaperTypeGrid({
  classId,
  subjectId,
  assignedKinds,
}: {
  classId: string;
  subjectId: string;
  assignedKinds?: BlockAssignmentKind[] | null;
}) {
  const enabled = TYPES.filter(item => assignedKinds == null || assignedKinds.some(kind => kind === secondPaperSectionAssignmentKind(item.slug)));
  const disabled = TYPES.filter(item => !enabled.includes(item));
  return (
    <div className="space-y-4">
      {enabled.length === 0 ? <p className="rounded-lg border p-4 text-sm text-muted-foreground">No sections assigned. Update assignments in Block Manager.</p> : null}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {enabled.map((item) => {
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
    {disabled.length > 0 ? <details className="rounded-lg border p-4 text-sm">
      <summary className="cursor-pointer font-medium">Unassigned sections ({disabled.length}) — existing content</summary>
      <p className="mt-2 text-muted-foreground">Existing records remain accessible for editing. New blocks require assignment.</p>
      <div className="mt-3 flex flex-wrap gap-3">{disabled.map(item => <Link key={item.slug} className="text-primary underline underline-offset-4" href={`/admin/content/class/${classId}/subject/${subjectId}/${item.slug}`}>{item.title}</Link>)}</div>
    </details> : null}
    </div>
  );
}
