import Link from "next/link";
import { BookOpenCheck, ArrowRight, ClipboardCheck, GraduationCap } from "lucide-react";
import { isEnglishFirstPaperSubject, isEnglishSecondPaperSubject } from "@/app/admin/content/navigation-helpers";
import { requireStudent } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

const FIRST_PAPER = [
  ["Seen Composition", "seen-composition"],
  ["Unseen Composition", "unseen-composition"],
  ["Matching Sentences", "matching-sentences"],
  ["Rearrange Sentence", "rearrange-sentence"],
  ["Question from Poems", "question-from-poems"],
  ["Question from Story", "question-from-story"],
] as const;

const SECOND_PAPER = [
  ["Gap Filling", "gap-filling"],
  ["Substitution Table", "substitution-table"],
  ["Right Form of Verb", "right-form-of-verb"],
  ["Narration", "narration"],
  ["Changing Sentence", "changing-sentence"],
  ["Punctuation and Capitalization", "punctuation-and-capitalization"],
  ["Preposition", "preposition"],
  ["Suffix and Prefix", "suffix-and-prefix"],
  ["Tag Question", "tag-question"],
  ["Connector", "connector"],
] as const;

export default async function StudentPracticeLibraryPage() {
  const user = await requireStudent();
  const subjects = user.classId
    ? await prisma.subject.findMany({
        where: { organizationId: user.organizationId, classId: user.classId, status: "published" },
        select: { id: true, name: true, slug: true, code: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      })
    : [];

  return (
    <div className="space-y-5">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Explore & practice</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Practice Library</h1><p className="mt-1 text-sm text-muted-foreground">Choose a subject and open the exercises available to your class.</p></div>
      {!subjects.length && <div className="student-panel rounded-2xl p-8 text-center text-sm text-muted-foreground">No published subjects are assigned yet.</div>}
      {subjects.map((subject) => {
        const firstPaper = isEnglishFirstPaperSubject(subject);
        const secondPaper = isEnglishSecondPaperSubject(subject);
        const kinds = secondPaper ? SECOND_PAPER : firstPaper ? FIRST_PAPER : [];
        return <section key={subject.id} className="student-panel rounded-2xl p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><BookOpenCheck className="size-5" /></span><div><h2 className="font-bold">{subject.name}</h2><p className="text-xs text-muted-foreground">{secondPaper ? "English 2nd Paper practice" : firstPaper ? "English 1st Paper practice" : "Chapter-based learning"}</p></div></div><Link href={`/user/chapter-preparation/subjects/${subject.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">Open Subject <ArrowRight className="size-4" /></Link></div>
          {kinds.length > 0 ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {kinds.map(([label, slug]) => <Link key={slug} href={`/user/chapter-preparation/subjects/${subject.id}/${slug}`} className="student-nav-card group flex min-h-14 items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium transition-all"><ClipboardCheck className="size-4.5 shrink-0 text-primary" /><span className="flex-1">{label}</span><ArrowRight className="size-4 text-muted-foreground group-hover:text-primary" /></Link>)}
          </div> : <Link href={`/user/chapter-preparation/subjects/${subject.id}`} className="student-nav-card inline-flex min-h-12 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium transition-all"><GraduationCap className="size-4 text-primary" /> Browse Units and Lessons <ArrowRight className="size-4 text-primary" /></Link>}
        </section>;
      })}
    </div>
  );
}
