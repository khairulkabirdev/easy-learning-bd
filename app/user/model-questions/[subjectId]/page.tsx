import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { studentPaperScope } from "@/lib/model-question-papers";
import { requireStudent } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

const PAGE_SIZE = 18;

export default async function ModelSubjectPage({ params, searchParams }: {
  params: Promise<{ subjectId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const student = await requireStudent();
  const { subjectId } = await params;
  if (!student.classId) notFound();
  const scope = { classId: student.classId, subjectId, organizationId: student.organizationId };
  const where = studentPaperScope(scope);
  const [subject, total] = await Promise.all([
    prisma.subject.findFirst({
      where: { ...where.subject, id: subjectId, class: where.class },
      select: { name: true, class: { select: { name: true } } },
    }),
    prisma.modelQuestionSet.count({ where }),
  ]);
  if (!subject) notFound();
  const requested = Number((await searchParams).page);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Number.isSafeInteger(requested) ? Math.max(1, Math.min(requested, pages)) : 1;
  const papers = await prisma.modelQuestionSet.findMany({
    where, orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
    select: { id: true, name: true, board: { select: { name: true } }, academicYear: { select: { year: true } } },
  });
  const root = `/user/model-questions/${subjectId}`;
  return (
    <div className="space-y-5 pb-8">
      <Link href="/user/model-questions" className={buttonVariants({ variant: "ghost", size: "sm" })}><ArrowLeft /> Subjects</Link>
      <header className="space-y-3 rounded-2xl border bg-card p-5 sm:p-8">
        <Badge variant="secondary">{subject.class.name}</Badge>
        <h1 className="text-3xl font-bold tracking-tight">{subject.name}</h1>
        <p className="text-muted-foreground">{total ? `${total} model ${total === 1 ? "paper" : "papers"} available for practice.` : "No model papers have been published for this subject yet."}</p>
      </header>

      {papers.length ? <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {papers.map(paper => (
          <li key={paper.id}>
            <Link href={`${root}/${paper.id}`} className="group flex h-full items-start gap-4 rounded-2xl border bg-card p-5 transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><FileText className="size-5" aria-hidden /></div>
              <div className="min-w-0 flex-1 space-y-2">
                <h2 className="break-words font-semibold leading-snug">{paper.name}</h2>
                {paper.board || paper.academicYear ? <div className="flex flex-wrap gap-1.5">
                  {paper.board && <Badge variant="outline">{paper.board.name}</Badge>}
                  {paper.academicYear && <Badge variant="outline">{paper.academicYear.year}</Badge>}
                </div> : null}
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">Start test <ArrowUpRight className="size-4" aria-hidden /></span>
              </div>
            </Link>
          </li>
        ))}
      </ul> : <Card><CardContent className="py-8 text-sm text-muted-foreground">Choose another subject or come back when your teacher has published a paper.</CardContent></Card>}

      {pages > 1 && <nav aria-label="Model paper pages" className="flex items-center justify-between gap-2">
        {page > 1 ? <Link href={`${root}?page=${page - 1}`} className={buttonVariants({ variant: "outline" })}>Previous</Link> : <span />}
        <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
        {page < pages ? <Link href={`${root}?page=${page + 1}`} className={buttonVariants({ variant: "outline" })}>Next</Link> : <span />}
      </nav>}
    </div>
  );
}
